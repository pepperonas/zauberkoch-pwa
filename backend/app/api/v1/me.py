"""Current-user endpoints."""

import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DbSession

from pydantic import ValidationError

from fastapi import Request

from app.core.security import _load_session, get_current_session, get_current_user, require_csrf
from app.db import get_db
from app.models import Invite, Session as SessionModel, User
from app.schemas.recipe import Preferences

router = APIRouter(prefix="/me")


@router.get("")
def me(request: Request, db: DbSession = Depends(get_db)) -> dict:
    """200 for everyone: {"authenticated": false} when logged out — a 401
    here would log a console error on every anonymous page view."""
    session = _load_session(request, db)
    user = db.get(User, session.user_id) if session else None
    if session is None or user is None:
        return {"authenticated": False}
    from app.core.config import get_settings

    return {
        "authenticated": True,
        "is_admin": user.email.lower() in get_settings().admin_emails,
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture_url": user.picture_url,
        "adult_confirmed": user.adult_confirmed_at is not None,
        "csrf_token": session.csrf_token,
        "preferences": load_preferences(user).model_dump(),
    }


@router.post("/confirm-adult", dependencies=[Depends(require_csrf)])
def confirm_adult(user: User = Depends(get_current_user), db: DbSession = Depends(get_db)) -> dict:
    if user.adult_confirmed_at is None:
        user.adult_confirmed_at = datetime.now(timezone.utc)
        db.commit()
    return {"adult_confirmed": True}


def load_preferences(user: User) -> Preferences:
    try:
        return Preferences.model_validate_json(user.preferences_json or "{}")
    except ValidationError:
        return Preferences()


@router.put("/preferences", dependencies=[Depends(require_csrf)])
def put_preferences(
    prefs: Preferences,
    user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
) -> dict:
    user.preferences_json = prefs.model_dump_json()
    db.commit()
    return {"preferences": prefs.model_dump()}


INVITES_PER_USER = 5
# 13 chars over a 31-symbol unambiguous lowercase alphabet ≈ 64.4 bits entropy
# (codes are lowercased on validation, so the alphabet must be lowercase-safe)
_CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"


def _new_invite_code() -> str:
    return "zk-" + "".join(secrets.choice(_CODE_ALPHABET) for _ in range(13))


@router.get("/invites")
def my_invites(user: User = Depends(get_current_user), db: DbSession = Depends(get_db)) -> dict:
    """Every user gets a handful of single-use signup codes (auto-provisioned)."""
    from sqlalchemy import select as _select

    rows = list(db.execute(_select(Invite).where(Invite.created_by == user.id).order_by(Invite.id)).scalars())
    while len(rows) < INVITES_PER_USER:
        invite = Invite(code=_new_invite_code(), created_by=user.id)
        db.add(invite)
        db.commit()
        rows.append(invite)
    return {"items": [{"code": r.code, "used": r.used_at is not None} for r in rows]}
