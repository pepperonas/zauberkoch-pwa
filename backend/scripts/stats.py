"""Usage/cost report from the generations log.

Usage (from backend/, venv active):
    python -m scripts.stats [days]     # default: 30
"""

import sys
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select

from app.db import SessionLocal
from app.models import Generation

# USD per 1M tokens — adjust when pricing or model changes
PRICE_IN = 2.00        # claude-sonnet-5 input (intro pricing through 2026-08-31, then 3.00)
PRICE_OUT = 10.00      # output (intro; then 15.00)
PRICE_CACHE_READ = PRICE_IN * 0.1
PRICE_CACHE_WRITE = PRICE_IN * 1.25


def main() -> int:
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 30
    since = datetime.now(timezone.utc) - timedelta(days=days)
    db = SessionLocal()
    try:
        rows = db.execute(select(Generation).where(Generation.created_at >= since)).scalars().all()
        if not rows:
            print(f"no generations in the last {days} days")
            return 0

        live = [r for r in rows if not r.cached]
        cached = [r for r in rows if r.cached]
        errors = [r for r in rows if r.status == "error"]
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
        p50 = durations[len(durations) // 2] if durations else 0

        print(f"=== Zauberkoch usage, last {days} days ===")
        print(f"generations:     {len(rows)}  (live {len(live)}, cache-hits {len(cached)}, errors {len(errors)})")
        print(f"prompt-cache:    read {cache_read:,} tok / write {cache_write:,} tok "
              f"({0 if not live else round(100 * sum(1 for r in live if r.cache_read_tokens > 0) / len(live))}% of live calls hit)")
        print(f"tokens:          in {tokens_in:,} / out {tokens_out:,}")
        print(f"est. cost:       ${cost:.2f}")
        print(f"median duration: {p50/1000:.1f}s")

        by_user = db.execute(
            select(Generation.user_id, func.count())
            .where(Generation.created_at >= since)
            .group_by(Generation.user_id)
            .order_by(func.count().desc())
        ).all()
        print("per user:        " + ", ".join(f"#{uid}: {n}" for uid, n in by_user))
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
