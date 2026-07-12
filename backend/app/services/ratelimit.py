"""Persistent daily generation limits (per user + global cost guard)."""

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.core.config import get_settings
from app.models import RateLimit

GLOBAL_SCOPE = "global"
ANON_SCOPE = "anon"


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
    settings = get_settings()
    day = _today()
    user_row = _get_or_create(db, f"user:{user_id}", day)
    return {
        "used_today": user_row.count,
        "daily_limit": settings.daily_limit_per_user,
        "remaining": max(settings.daily_limit_per_user - user_row.count, 0),
    }


def consume_generation(db: DbSession, user_id: int) -> None:
    """Reserve one generation for today or raise 429. Cache hits must NOT call this."""
    settings = get_settings()
    day = _today()
    user_row = _get_or_create(db, f"user:{user_id}", day)
    global_row = _get_or_create(db, GLOBAL_SCOPE, day)

    if user_row.count >= settings.daily_limit_per_user:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "daily_limit_user",
                "message": "Tageslimit erreicht — morgen geht's weiter!",
                "retry_after": _seconds_until_midnight_utc(),
            },
        )
    if global_row.count >= settings.daily_limit_global:
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
    settings = get_settings()
    day = _today()
    anon_row = _get_or_create(db, ANON_SCOPE, day)
    global_row = _get_or_create(db, GLOBAL_SCOPE, day)
    if anon_row.count >= settings.daily_limit_anon or global_row.count >= settings.daily_limit_global:
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
