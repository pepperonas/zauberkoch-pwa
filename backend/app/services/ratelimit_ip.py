"""Lightweight in-memory per-IP rate limiter for auth endpoints.

Single-process deployment (one uvicorn worker), so in-memory is sufficient.
Generation limits (per-user/global, persistent) live in services/ratelimit.py.
"""

import time
from collections import defaultdict

from fastapi import HTTPException, Request

_hits: dict[str, list[float]] = defaultdict(list)


def check_ip_limit(request: Request, *, scope: str, limit: int = 20, window_s: int = 60) -> None:
    ip = request.client.host if request.client else "unknown"
    key = f"{scope}:{ip}"
    now = time.monotonic()
    hits = [t for t in _hits[key] if now - t < window_s]
    if len(hits) >= limit:
        raise HTTPException(
            status_code=429,
            detail={"code": "rate_limited", "message": "Zu viele Anfragen. Bitte kurz warten."},
        )
    hits.append(now)
    _hits[key] = hits


def reset() -> None:  # for tests
    _hits.clear()
