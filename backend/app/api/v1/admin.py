"""Admin panel API: usage/cost dashboard + allowlist management.

Gated by require_admin (email in ZK_ADMIN_EMAILS) — 404 for everyone else.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select
from sqlalchemy.orm import Session as DbSession

from app.core.config import get_settings
from app.core.security import require_admin, require_csrf
from app.db import get_db
from app.models import AllowlistEntry, Generation, Invite, Recipe, User

router = APIRouter(prefix="/admin", dependencies=[Depends(require_admin)])

# USD per 1M tokens — keep in sync with scripts/stats.py.
# claude-sonnet-5 INTRO pricing through 2026-08-31; raise to 3.00/15.00 after.
PRICE_IN = 2.00
PRICE_OUT = 10.00
PRICE_CACHE_READ = PRICE_IN * 0.1
PRICE_CACHE_WRITE = PRICE_IN * 1.25


@router.get("/stats")
def stats(
    days: int = Query(default=30, ge=1, le=365),
    db: DbSession = Depends(get_db),
) -> dict:
    settings = get_settings()
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = db.execute(select(Generation).where(Generation.created_at >= since)).scalars().all()

    live = [r for r in rows if not r.cached]
    tokens_in = sum(r.input_tokens for r in live)
    tokens_out = sum(r.output_tokens for r in live)
    cache_read = sum(r.cache_read_tokens for r in live)
    cache_write = sum(r.cache_write_tokens for r in live)
    cost = (
        tokens_in / 1e6 * PRICE_IN
        + tokens_out / 1e6 * PRICE_OUT
        + cache_read / 1e6 * PRICE_CACHE_READ
        + cache_write / 1e6 * PRICE_CACHE_WRITE
    )
    durations = sorted(r.duration_ms for r in live if r.duration_ms)

    users = {u.id: u.email for u in db.execute(select(User)).scalars()}
    per_user_rows = db.execute(
        select(Generation.user_id, func.count())
        .where(Generation.created_at >= since)
        .group_by(Generation.user_id)
        .order_by(func.count().desc())
    ).all()

    feedback_rows = db.execute(
        select(Recipe.prompt_version, Recipe.feedback, func.count())
        .where(Recipe.feedback.is_not(None))
        .group_by(Recipe.prompt_version, Recipe.feedback)
    ).all()
    feedback: dict[str, dict[str, int]] = {}
    for version, wert, n in feedback_rows:
        entry = feedback.setdefault(version, {"up": 0, "down": 0})
        entry["up" if wert == 1 else "down"] += n

    return {
        "days": days,
        "generations": {
            "total": len(rows),
            "live": len(live),
            "cached": sum(1 for r in rows if r.cached),
            "errors": sum(1 for r in rows if r.status == "error"),
        },
        "tokens": {"in": tokens_in, "out": tokens_out, "cache_read": cache_read, "cache_write": cache_write},
        "cache_hit_rate": (
            round(100 * sum(1 for r in live if r.cache_read_tokens > 0) / len(live)) if live else 0
        ),
        "cost_usd": round(cost, 2),
        "median_duration_ms": durations[len(durations) // 2] if durations else 0,
        "per_user": [
            {"email": users.get(uid, f"#{uid}"), "count": n} for uid, n in per_user_rows
        ],
        "feedback": feedback,
        "limits": {
            "per_user": settings.daily_limit_per_user,
            "global": settings.daily_limit_global,
        },
    }


@router.get("/allowlist")
def list_allowlist(db: DbSession = Depends(get_db)) -> dict:
    entries = db.execute(select(AllowlistEntry).order_by(AllowlistEntry.email)).scalars().all()
    registered = {u.email for u in db.execute(select(User)).scalars()}
    return {
        "items": [
            {"email": e.email, "registered": e.email in registered, "created_at": e.created_at.isoformat()}
            for e in entries
        ]
    }


class AllowlistBody(BaseModel):
    email: EmailStr


@router.post("/allowlist", dependencies=[Depends(require_csrf)])
def add_allowlist(body: AllowlistBody, db: DbSession = Depends(get_db)) -> dict:
    email = body.email.lower()
    existing = db.execute(select(AllowlistEntry).where(AllowlistEntry.email == email)).scalar_one_or_none()
    if existing is None:
        db.add(AllowlistEntry(email=email))
        db.commit()
    return {"email": email}


@router.delete("/allowlist/{email}", dependencies=[Depends(require_csrf)])
def remove_allowlist(email: str, db: DbSession = Depends(get_db)) -> dict:
    entry = db.execute(select(AllowlistEntry).where(AllowlistEntry.email == email.lower())).scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Eintrag nicht gefunden."})
    db.delete(entry)
    db.commit()
    return {"deleted": email.lower()}


# ── Invite codes ──────────────────────────────────────────────────────────
# Admin-issued single-use signup codes (same `invites` table as the per-user
# codes; distinguished only by created_by = the admin). Signup accepts a valid
# unused code even when OPEN_SIGNUP is off.


def _invite_out(inv: Invite, users: dict[int, str]) -> dict:
    return {
        "code": inv.code,
        "used": inv.used_at is not None,
        "used_by": users.get(inv.used_by) if inv.used_by else None,
        "created_at": inv.created_at.isoformat(),
    }


@router.get("/invites")
def list_invites(db: DbSession = Depends(get_db)) -> dict:
    """All invite codes, newest first, with the email of who redeemed each."""
    rows = db.execute(select(Invite).order_by(Invite.id.desc())).scalars().all()
    users = {u.id: u.email for u in db.execute(select(User.id, User.email)).all()}
    return {"items": [_invite_out(r, users) for r in rows]}


class InviteCreateBody(BaseModel):
    count: int = 1


@router.post("/invites", dependencies=[Depends(require_csrf)])
def create_invites(
    body: InviteCreateBody,
    admin: User = Depends(require_admin),
    db: DbSession = Depends(get_db),
) -> dict:
    """Mint N fresh single-use codes. Returns them once for the admin to copy."""
    from app.api.v1.me import _new_invite_code

    count = max(1, min(body.count, 50))
    created: list[str] = []
    for _ in range(count):
        # retry on the (astronomically unlikely) unique-code collision
        for _attempt in range(5):
            code = _new_invite_code()
            if db.execute(select(Invite.id).where(Invite.code == code)).scalar_one_or_none() is None:
                db.add(Invite(code=code, created_by=admin.id))
                created.append(code)
                break
    db.commit()
    return {"created": created}


@router.delete("/invites/{code}", dependencies=[Depends(require_csrf)])
def revoke_invite(code: str, db: DbSession = Depends(get_db)) -> dict:
    inv = db.execute(select(Invite).where(Invite.code == code)).scalar_one_or_none()
    if inv is None:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Code nicht gefunden."})
    if inv.used_at is not None:
        raise HTTPException(
            status_code=409,
            detail={"code": "already_used", "message": "Bereits eingelöste Codes können nicht gelöscht werden."},
        )
    db.delete(inv)
    db.commit()
    return {"deleted": code}
