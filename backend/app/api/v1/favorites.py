"""Favorite toggle endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.core.security import get_current_user, require_csrf
from app.db import get_db
from app.models import Favorite, Recipe, User

router = APIRouter(prefix="/recipes/{recipe_id}/favorite", dependencies=[Depends(require_csrf)])


def _owned_recipe(recipe_id: int, user: User, db: DbSession) -> Recipe:
    row = db.get(Recipe, recipe_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Rezept nicht gefunden."})
    return row


@router.put("")
def add_favorite(recipe_id: int, user: User = Depends(get_current_user), db: DbSession = Depends(get_db)) -> dict:
    _owned_recipe(recipe_id, user, db)
    existing = db.execute(
        select(Favorite).where(Favorite.user_id == user.id, Favorite.recipe_id == recipe_id)
    ).scalar_one_or_none()
    if existing is None:
        db.add(Favorite(user_id=user.id, recipe_id=recipe_id))
        db.commit()
    return {"is_favorite": True}


@router.delete("")
def remove_favorite(recipe_id: int, user: User = Depends(get_current_user), db: DbSession = Depends(get_db)) -> dict:
    existing = db.execute(
        select(Favorite).where(Favorite.user_id == user.id, Favorite.recipe_id == recipe_id)
    ).scalar_one_or_none()
    if existing is not None:
        db.delete(existing)
        db.commit()
    return {"is_favorite": False}
