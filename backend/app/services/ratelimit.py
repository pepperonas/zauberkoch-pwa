"""Persistent daily generation limits (per user + global cost guard)."""

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.models import RateLimit, User
from app.services.limits import get_limits

GLOBAL_SCOPE = "global"
ANON_SCOPE = "anon"
REGISTRATION_SCOPE = "registrations"


def effective_limit(db: DbSession, user_id: int) -> int:
    """The user's own daily cap, or the system default when unset (NULL)."""
    dl = db.execute(select(User.daily_limit).where(User.id == user_id)).scalar_one_or_none()
    return dl if dl is not None else get_limits(db).default_user_limit


def _today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def _seconds_until_midnight_utc() -> int:
    now = datetime.now(timezone.utc)
    return int(86400 - (now.hour * 3600 + now.minute * 60 + now.second))


def _get_or_create(db: DbSession, scope: str, day: str) -> RateLimit:
    row = db.execute(select(RateLimit).where(RateLimit.scope == scope, RateLimit.day == day)).scalar_one_or_none()
    if row is None:
        row = RateLimit(scope=scope, day=day, count=0)
        db.add(row)
        db.flush()
    return row


def get_usage(db: DbSession, user_id: int) -> dict:
    day = _today()
    limit = effective_limit(db, user_id)
    user_row = _get_or_create(db, f"user:{user_id}", day)
    return {
        "used_today": user_row.count,
        "daily_limit": limit,
        "remaining": max(limit - user_row.count, 0),
    }


def consume_generation(db: DbSession, user_id: int) -> None:
    """Reserve one generation for today or raise 429. Cache hits must NOT call this."""
    day = _today()
    limit = effective_limit(db, user_id)
    global_limit = get_limits(db).global_daily_limit
    user_row = _get_or_create(db, f"user:{user_id}", day)
    global_row = _get_or_create(db, GLOBAL_SCOPE, day)

    if user_row.count >= limit:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "daily_limit_user",
                "message": "Tageslimit erreicht — morgen geht's weiter!",
                "retry_after": _seconds_until_midnight_utc(),
            },
        )
    if global_row.count >= global_limit:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "daily_limit_global",
                "message": "Der Zauberkoch macht heute Pause — bitte morgen wieder vorbeischauen.",
                "retry_after": _seconds_until_midnight_utc(),
            },
        )

    user_row.count += 1
    global_row.count += 1
    db.commit()


def consume_anon(db: DbSession) -> None:
    """One logged-out taster generation — tight global budget, or 429."""
    limits = get_limits(db)
    day = _today()
    anon_row = _get_or_create(db, ANON_SCOPE, day)
    global_row = _get_or_create(db, GLOBAL_SCOPE, day)
    if anon_row.count >= limits.anon_global_limit or global_row.count >= limits.global_daily_limit:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "daily_limit_anon",
                "message": "Der Probier-Zauber ist für heute ausgeschöpft — melde dich an oder schau morgen wieder vorbei.",
                "retry_after": _seconds_until_midnight_utc(),
            },
        )
    anon_row.count += 1
    global_row.count += 1
    db.commit()


def consume_scoped(db: DbSession, scope: str, limit: int, message: str) -> None:
    """Generic persistent daily budget (e.g. fridge scans per user)."""
    day = _today()
    row = _get_or_create(db, scope, day)
    if row.count >= limit:
        raise HTTPException(
            status_code=429,
            detail={"code": "daily_limit_scoped", "message": message, "retry_after": _seconds_until_midnight_utc()},
        )
    row.count += 1
    db.commit()


def registrations_today(db: DbSession) -> int:
    """How many new accounts were created today (UTC)."""
    row = db.execute(
        select(RateLimit.count).where(RateLimit.scope == REGISTRATION_SCOPE, RateLimit.day == _today())
    ).scalar_one_or_none()
    return row or 0


def consume_registration(db: DbSession) -> None:
    """Reserve one new-account slot for today, or raise 429 (blocks signup only —
    existing users keep logging in)."""
    limit = get_limits(db).registration_daily_limit
    day = _today()
    row = _get_or_create(db, REGISTRATION_SCOPE, day)
    if row.count >= limit:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "daily_limit_registration",
                "message": "Für heute sind alle Neuanmeldungen vergeben — bitte morgen wieder vorbeischauen.",
                "retry_after": _seconds_until_midnight_utc(),
            },
        )
    row.count += 1
    db.commit()
