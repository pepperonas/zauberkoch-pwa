"""Weekly meal planner: assign recipes to days, push a whole week to the
shopping list (reuses the aggregation logic)."""

import json
import re
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.api.v1.shopping import _items, _serialize, merge_recipe_into_list
from app.core.security import get_current_user, require_csrf
from app.db import get_db
from app.models import MealPlanEntry, Recipe, User

router = APIRouter(prefix="/plan")

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MAX_PER_DAY = 6


def _monday(value: str | None) -> date:
    if value:
        if not _DATE_RE.match(value):
            raise HTTPException(status_code=422, detail={"code": "bad_date", "message": "Ungültiges Datum."})
        d = date.fromisoformat(value)
    else:
        d = date.today()
    return d - timedelta(days=d.weekday())


def _week_days(monday: date) -> list[str]:
    return [(monday + timedelta(days=i)).isoformat() for i in range(7)]


def _entry_item(entry: MealPlanEntry, row: Recipe) -> dict:
    recipe = json.loads(row.recipe_json)
    return {
        "id": entry.id,
        "recipe_id": row.id,
        "titel": row.titel,
        "kueche": row.kueche,
        "mode": row.mode,
        "glas": recipe.get("glas"),
        "tags": recipe.get("tags", []),
        "zeit_gesamt": recipe.get("zeit_gesamt"),
    }


@router.get("")
def get_week(
    start: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
) -> dict:
    monday = _monday(start)
    days = _week_days(monday)
    rows = db.execute(
        select(MealPlanEntry, Recipe)
        .join(Recipe, Recipe.id == MealPlanEntry.recipe_id)
        .where(
            MealPlanEntry.user_id == user.id,
            MealPlanEntry.datum.in_(days),
            Recipe.deleted_at.is_(None),  # deleted recipe drops out of the plan view
        )
        .order_by(MealPlanEntry.id)
    ).all()
    by_day: dict[str, list[dict]] = {d: [] for d in days}
    for entry, recipe in rows:
        by_day[entry.datum].append(_entry_item(entry, recipe))
    return {"start": monday.isoformat(), "days": [{"datum": d, "entries": by_day[d]} for d in days]}


class PlanBody(BaseModel):
    datum: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    recipe_id: int


@router.post("", dependencies=[Depends(require_csrf)])
def add_entry(body: PlanBody, user: User = Depends(get_current_user), db: DbSession = Depends(get_db)) -> dict:
    row = db.get(Recipe, body.recipe_id)
    if row is None or row.user_id != user.id or row.deleted_at is not None:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Rezept nicht gefunden."})
    existing = db.execute(
        select(MealPlanEntry).where(
            MealPlanEntry.user_id == user.id,
            MealPlanEntry.datum == body.datum,
            MealPlanEntry.recipe_id == body.recipe_id,
        )
    ).scalar_one_or_none()
    if existing is not None:
        return {"id": existing.id}
    day_count = db.execute(
        select(MealPlanEntry).where(MealPlanEntry.user_id == user.id, MealPlanEntry.datum == body.datum)
    ).scalars().all()
    if len(day_count) >= MAX_PER_DAY:
        raise HTTPException(status_code=422, detail={"code": "day_full", "message": "Dieser Tag ist voll."})
    entry = MealPlanEntry(user_id=user.id, datum=body.datum, recipe_id=body.recipe_id)
    db.add(entry)
    db.commit()
    return {"id": entry.id}


@router.delete("/{entry_id}", dependencies=[Depends(require_csrf)])
def remove_entry(entry_id: int, user: User = Depends(get_current_user), db: DbSession = Depends(get_db)) -> dict:
    entry = db.get(MealPlanEntry, entry_id)
    if entry is None or entry.user_id != user.id:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Eintrag nicht gefunden."})
    db.delete(entry)
    db.commit()
    return {"deleted": entry_id}


class WeekBody(BaseModel):
    start: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")


@router.post("/to-shopping", dependencies=[Depends(require_csrf)])
def week_to_shopping(body: WeekBody, user: User = Depends(get_current_user), db: DbSession = Depends(get_db)) -> dict:
    """Aggregate every planned recipe of the week into the shopping list."""
    days = _week_days(_monday(body.start))
    rows = db.execute(
        select(Recipe)
        .join(MealPlanEntry, MealPlanEntry.recipe_id == Recipe.id)
        .where(
            MealPlanEntry.user_id == user.id,
            MealPlanEntry.datum.in_(days),
            Recipe.deleted_at.is_(None),
        )
        .order_by(MealPlanEntry.id)
    ).scalars().all()
    for row in rows:
        merge_recipe_into_list(db, user, row)
    return {"added_recipes": len(rows), "items": [_serialize(i) for i in _items(db, user)]}
