"""Recipe generation (SSE) and history."""

import json
import logging
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.core.security import get_current_user, require_csrf
from app.db import get_db
from app.models import Favorite, Recipe, User
from app.schemas.recipe import GenerateParams
from app.services import ai, cache, ratelimit
from app.services.json_stream import Event, replay_events

logger = logging.getLogger("zauberkoch.recipes")
router = APIRouter(prefix="/recipes")


def _sse(event: str, data) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _persist_recipe(db: DbSession, user: User, params: GenerateParams, recipe: dict, prompt_version: str, model: str) -> Recipe:
    row = Recipe(
        user_id=user.id,
        mode=params.modus,
        params_json=json.dumps(params.cache_relevant(), ensure_ascii=False, sort_keys=True),
        recipe_json=json.dumps(recipe, ensure_ascii=False),
        titel=recipe.get("titel", ""),
        kueche=recipe.get("kueche", ""),
        prompt_version=prompt_version,
        model=model,
    )
    db.add(row)
    db.commit()
    return row


@router.post("/generate", dependencies=[Depends(require_csrf)])
async def generate(
    params: GenerateParams,
    user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
) -> StreamingResponse:
    if params.modus == "cocktail" and user.adult_confirmed_at is None:
        raise HTTPException(
            status_code=403,
            detail={"code": "adult_required", "message": "Bitte zuerst bestätigen, dass du 18+ bist."},
        )

    h = cache.params_hash(params)
    cached = None if params.regenerate else cache.get_cached(db, h)

    if cached is None:
        # Real generation: consume the daily budget up front (cache hits are free)
        ratelimit.consume_generation(db, user.id)

    async def event_stream() -> AsyncGenerator[str, None]:
        if cached is not None:
            recipe = json.loads(cached.recipe_json)
            cache.register_hit(db, cached)
            row = _persist_recipe(db, user, params, recipe, cached.prompt_version, cached.model)
            for name, data in replay_events(recipe):
                yield _sse(name, data)
            yield _sse("saved", {"recipe_id": row.id, "cached": True, **ratelimit.get_usage(db, user.id)})
            return

        model = ai.get_settings_model()
        final: dict | None = None
        async for name, data in ai.generate_recipe_events(params):
            yield _sse(name, data)
            if name == "done":
                final = data
        if final is not None:
            recipe_json = json.dumps(final, ensure_ascii=False)
            cache.store(db, h, recipe_json, ai.prompt_version(), model)
            row = _persist_recipe(db, user, params, final, ai.prompt_version(), model)
            yield _sse("saved", {"recipe_id": row.id, "cached": False, **ratelimit.get_usage(db, user.id)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("")
def list_recipes(
    q: str = Query(default="", max_length=100),
    mode: str = Query(default="", pattern="^(kochen|cocktail)?$"),
    kueche: str = Query(default="", max_length=64),
    favorites_only: bool = False,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
) -> dict:
    stmt = select(Recipe).where(Recipe.user_id == user.id)
    if q:
        stmt = stmt.where(Recipe.titel.ilike(f"%{q}%"))
    if mode:
        stmt = stmt.where(Recipe.mode == mode)
    if kueche:
        stmt = stmt.where(Recipe.kueche == kueche)
    if favorites_only:
        stmt = stmt.join(Favorite, Favorite.recipe_id == Recipe.id).where(Favorite.user_id == user.id)
    stmt = stmt.order_by(Recipe.created_at.desc()).limit(limit).offset(offset)
    rows = db.execute(stmt).scalars().all()

    fav_ids = set(
        db.execute(select(Favorite.recipe_id).where(Favorite.user_id == user.id)).scalars().all()
    )
    items = []
    for r in rows:
        recipe = json.loads(r.recipe_json)
        items.append(
            {
                "id": r.id,
                "mode": r.mode,
                "titel": r.titel,
                "teaser": recipe.get("teaser", ""),
                "kueche": r.kueche,
                "tags": recipe.get("tags", []),
                "zeit_gesamt": recipe.get("zeit_gesamt"),
                "schwierigkeit": recipe.get("schwierigkeit"),
                "is_favorite": r.id in fav_ids,
                "created_at": r.created_at.isoformat(),
            }
        )
    return {"items": items}


@router.get("/{recipe_id}")
def get_recipe(recipe_id: int, user: User = Depends(get_current_user), db: DbSession = Depends(get_db)) -> dict:
    row = db.get(Recipe, recipe_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Rezept nicht gefunden."})
    is_fav = (
        db.execute(
            select(Favorite).where(Favorite.user_id == user.id, Favorite.recipe_id == row.id)
        ).scalar_one_or_none()
        is not None
    )
    return {
        "id": row.id,
        "mode": row.mode,
        "recipe": json.loads(row.recipe_json),
        "is_favorite": is_fav,
        "created_at": row.created_at.isoformat(),
    }
