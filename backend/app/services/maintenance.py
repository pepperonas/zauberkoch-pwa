"""Housekeeping: purge expired sessions and stale rate-limit rows.

Runs at startup and then daily from the lifespan task.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete

from app.db import SessionLocal
from app.models import RateLimit, Session as SessionModel

logger = logging.getLogger("zauberkoch.maintenance")


def cleanup() -> dict:
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        sessions = db.execute(delete(SessionModel).where(SessionModel.expires_at < now)).rowcount
        cutoff = (now - timedelta(days=7)).date().isoformat()
        limits = db.execute(delete(RateLimit).where(RateLimit.day < cutoff)).rowcount
        db.commit()
        if sessions or limits:
            logger.info("cleanup: removed %s expired sessions, %s old rate-limit rows", sessions, limits)
        return {"sessions": sessions, "rate_limits": limits}
    finally:
        db.close()


async def run_periodic(interval_s: int = 86400) -> None:
    while True:
        try:
            await asyncio.to_thread(cleanup)
        except Exception:
            logger.exception("cleanup failed")
        await asyncio.sleep(interval_s)
