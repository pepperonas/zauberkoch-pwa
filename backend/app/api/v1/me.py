"""Current-user endpoints."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DbSession

from app.core.security import get_current_session, get_current_user, require_csrf
from app.db import get_db
from app.models import Session as SessionModel, User

router = APIRouter(prefix="/me")


@router.get("")
def me(
    user: User = Depends(get_current_user),
    session: SessionModel = Depends(get_current_session),
) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture_url": user.picture_url,
        "adult_confirmed": user.adult_confirmed_at is not None,
        "csrf_token": session.csrf_token,
    }


@router.post("/confirm-adult", dependencies=[Depends(require_csrf)])
def confirm_adult(user: User = Depends(get_current_user), db: DbSession = Depends(get_db)) -> dict:
    if user.adult_confirmed_at is None:
        user.adult_confirmed_at = datetime.now(timezone.utc)
        db.commit()
    return {"adult_confirmed": True}
