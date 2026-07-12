"""Recipe generation (SSE) and history."""

import asyncio
import json
import logging
from typing import Literal
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.core.security import get_current_user, require_csrf
from app.db import get_db
from app.models import Favorite, Generation, Recipe, User
from app.schemas.recipe import GenerateParams
from app.api.v1.me import load_preferences
from app.services import ai, aggregation, cache, ratelimit
from app.services.ratelimit_ip import check_ip_limit
from app.services.json_stream import replay_events

logger = logging.getLogger("zauberkoch.recipes")
router = APIRouter(prefix="/recipes")


def _sse(event: str, data) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _persist_recipe(db: DbSession, user_id: int, params: GenerateParams, recipe: dict, prompt_version: str, model: str) -> Recipe:
    """Store the recipe in the user's history — reusing an existing row for
    identical params + prompt version (cache hits must not pile up duplicates)."""
    params_json = json.dumps(params.cache_relevant(), ensure_ascii=False, sort_keys=True)
    existing = db.execute(
        select(Recipe).where(
            Recipe.user_id == user_id,
            Recipe.params_json == params_json,
            Recipe.prompt_version == prompt_version,
            Recipe.titel == recipe.get("titel", ""),
        )
    ).scalars().first()
    if existing is not None:
        return existing
    row = Recipe(
        user_id=user_id,
        mode=params.modus,
        params_json=params_json,
        recipe_json=json.dumps(recipe, ensure_ascii=False),
        titel=recipe.get("titel", ""),
        kueche=recipe.get("kueche", ""),
        prompt_version=prompt_version,
        model=model,
    )
    db.add(row)
    db.commit()
    return row


def _scale_recipe(recipe: dict, personen: int) -> dict:
    """Serve a cached recipe for a different personen count: pure amount
    scaling (personen is excluded from the cache key for exactly this)."""
    base = recipe.get("portionen") or 0
    if not personen or not base or base == personen:
        return recipe
    factor = personen / base

    def nice(value: float | str | None) -> float | str | None:
        if isinstance(value, float):
            rounded = round(value, 2)
            return int(rounded) if rounded.is_integer() else rounded
        return value

    return {
        **recipe,
        "portionen": personen,
        "zutaten": [{**z, "menge": nice(aggregation.scale(z.get("menge"), factor))} for z in recipe.get("zutaten", [])],
    }


# Live generations keep running after a client disconnect so the paid result
# is persisted + cached; hold task references to protect them from GC.
_live_tasks: set[asyncio.Task] = set()


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

    # Merge the user's persistent preferences (diet flags OR'ed, no-gos united).
    # vermeiden_titel is strictly server-injected — discard client values.
    prefs = load_preferences(user)
    params = params.model_copy(
        update={
            "vegetarisch": params.vegetarisch or prefs.vegetarisch,
            "vegan": params.vegan or prefs.vegan,
            "glutenfrei": params.glutenfrei or prefs.glutenfrei,
            "laktosefrei": params.laktosefrei or prefs.laktosefrei,
            "proteinreich": params.proteinreich or prefs.proteinreich,
            "ketogen": params.ketogen or prefs.ketogen,
            "vermeiden": sorted({*params.vermeiden, *prefs.vermeiden}),
            "vermeiden_titel": [],
        }
    )

    h = cache.params_hash(params)
    current_version = ai.prompt_version()
    params_json = json.dumps(params.cache_relevant(), ensure_ascii=False, sort_keys=True)

    def _known_titles() -> list[str]:
        """Titles the user already received for these params (newest first)."""
        return list(
            db.execute(
                select(Recipe.titel)
                .where(Recipe.user_id == user.id, Recipe.params_json == params_json)
                .order_by(Recipe.id.desc())
                .limit(5)
            ).scalars()
        )

    cached = None if params.regenerate else cache.get_cached(db, h, current_version)

    if cached is not None:
        # A cached recipe the user has already received is a repeat, not a
        # convenience — generate a fresh variation instead. Exception: only
        # the personen count changed -> pure scaling, served from cache. The
        # cache still serves first-time requests (other users, error retry).
        titel = json.loads(cached.recipe_json).get("titel", "")
        seen = db.execute(
            select(Recipe).where(
                Recipe.user_id == user.id,
                Recipe.params_json == params_json,
                Recipe.prompt_version == cached.prompt_version,
                Recipe.titel == titel,
            )
        ).scalars().first()
        if seen is not None and json.loads(seen.recipe_json).get("portionen") == params.personen:
            cached = None
            params = params.model_copy(update={"regenerate": True})  # -> variation hint

    if params.regenerate:
        # Steer the variation away from everything already received (v4 prompt)
        titles = _known_titles()
        if titles:
            params = params.model_copy(update={"vermeiden_titel": titles})

    if cached is None:
        # Real generation: consume the daily budget up front (cache hits are free)
        ratelimit.consume_generation(db, user.id)

    user_id = user.id

    def _finalize_live(final: dict | None, usage: dict | None, model: str) -> dict | None:
        """Persist result + usage log with a FRESH session in a worker thread —
        must work even after the request (and its db session) is gone."""
        from app.db import SessionLocal

        session = SessionLocal()
        try:
            status = "ok" if final is not None else "error"
            session.add(
                Generation(
                    user_id=user_id,
                    mode=params.modus,
                    prompt_version=current_version,
                    model=model,
                    cached=False,
                    status=status,
                    **(usage or {}),
                )
            )
            session.commit()
            if final is None:
                return None
            cache.store(session, h, json.dumps(final, ensure_ascii=False), current_version, model)
            row = _persist_recipe(session, user_id, params, final, current_version, model)
            return {"recipe_id": row.id, "cached": False, **ratelimit.get_usage(session, user_id)}
        finally:
            session.close()

    def _log_cache_hit(prompt_version: str, model: str) -> None:
        db.add(
            Generation(
                user_id=user_id,
                mode=params.modus,
                prompt_version=prompt_version,
                model=model,
                cached=True,
                status="ok",
            )
        )
        db.commit()

    async def event_stream() -> AsyncGenerator[str, None]:
        if cached is not None:
            recipe = _scale_recipe(json.loads(cached.recipe_json), params.personen)
            cache.register_hit(db, cached)
            row = _persist_recipe(db, user_id, params, recipe, cached.prompt_version, cached.model)
            _log_cache_hit(cached.prompt_version, cached.model)
            for name, data in replay_events(recipe):
                yield _sse(name, data)
            yield _sse("saved", {"recipe_id": row.id, "cached": True, **ratelimit.get_usage(db, user_id)})
            return

        # Live path: producer task survives client disconnects, so the paid
        # generation is always persisted + cached (the retry becomes a hit).
        model = ai.get_settings_model()
        queue: asyncio.Queue[tuple[str, object] | None] = asyncio.Queue()

        async def produce() -> None:
            final: dict | None = None
            usage: dict | None = None
            failed = False
            try:
                async for name, data in ai.generate_recipe_events(params):
                    if name == "usage":
                        usage = data  # internal — never forwarded to the client
                        continue
                    if name == "error":
                        failed = True
                    if name == "done":
                        final = data
                    await queue.put((name, data))
                saved = await asyncio.to_thread(
                    _finalize_live, None if failed else final, usage, model
                )
                if saved is not None:
                    await queue.put(("saved", saved))
            except Exception:
                logger.exception("generation task failed")
                await queue.put(("error", {"code": "generation_failed", "message": "Generierung fehlgeschlagen."}))
            finally:
                await queue.put(None)

        task = asyncio.create_task(produce())
        _live_tasks.add(task)
        task.add_done_callback(_live_tasks.discard)

        while True:
            item = await queue.get()
            if item is None:
                break
            yield _sse(item[0], item[1])

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/try")
async def try_generate(
    params: GenerateParams,
    request: Request,
    db: DbSession = Depends(get_db),
) -> StreamingResponse:
    """Logged-out taster generation (landing page). Cost guards, strictly
    ordered: cache hits are free and unlimited; a live generation needs
    BOTH a per-IP allowance (2/day) AND the global anon budget. Nothing is
    persisted to a history; the result still fills the shared cache."""
    params = params.model_copy(
        update={
            "modus": "kochen",  # cocktails need the 18+ confirmation -> login
            "regenerate": False,
            "vermeiden_titel": [],
            "personen": min(params.personen or 2, 4),
        }
    )

    h = cache.params_hash(params)
    current_version = ai.prompt_version()
    cached = cache.get_cached(db, h, current_version)

    if cached is None:
        check_ip_limit(request, scope="try", limit=2, window_s=86400)
        ratelimit.consume_anon(db)

    def _finalize_anon(final: dict | None) -> None:
        if final is None:
            return
        from app.db import SessionLocal

        session = SessionLocal()
        try:
            cache.store(session, h, json.dumps(final, ensure_ascii=False), current_version, ai.get_settings_model())
        finally:
            session.close()

    async def event_stream() -> AsyncGenerator[str, None]:
        if cached is not None:
            recipe = _scale_recipe(json.loads(cached.recipe_json), params.personen)
            cache.register_hit(db, cached)
            for name, data in replay_events(recipe):
                yield _sse(name, data)
            return

        queue: asyncio.Queue[tuple[str, object] | None] = asyncio.Queue()

        async def produce() -> None:
            final: dict | None = None
            failed = False
            try:
                async for name, data in ai.generate_recipe_events(params):
                    if name == "usage":
                        continue
                    if name == "error":
                        failed = True
                    if name == "done":
                        final = data
                    await queue.put((name, data))
                await asyncio.to_thread(_finalize_anon, None if failed else final)
            except Exception:
                logger.exception("anon generation failed")
                await queue.put(("error", {"code": "generation_failed", "message": "Generierung fehlgeschlagen."}))
            finally:
                await queue.put(None)

        task = asyncio.create_task(produce())
        _live_tasks.add(task)
        task.add_done_callback(_live_tasks.discard)

        while True:
            item = await queue.get()
            if item is None:
                break
            yield _sse(item[0], item[1])

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
        pattern = f"%{q}%"
        stmt = stmt.where(Recipe.titel.ilike(pattern) | Recipe.recipe_json.ilike(pattern))
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
                "glas": recipe.get("glas"),  # cocktail glass type -> card motif
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
        "public_listed": row.public_listed,
        "shared": row.share_token is not None,
        "id": row.id,
        "mode": row.mode,
        "recipe": json.loads(row.recipe_json),
        "is_favorite": is_fav,
        "feedback": row.feedback,
        "notiz": row.notiz,
        "gekocht_count": row.gekocht_count,
        "created_at": row.created_at.isoformat(),
    }


class FeedbackBody(BaseModel):
    wert: Literal[1, -1]
    grund: str = Field(default="", max_length=255)


@router.post("/{recipe_id}/feedback", dependencies=[Depends(require_csrf)])
def give_feedback(
    recipe_id: int,
    body: FeedbackBody,
    user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
) -> dict:
    row = db.get(Recipe, recipe_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Rezept nicht gefunden."})
    row.feedback = body.wert
    row.feedback_grund = body.grund if body.wert == -1 else ""
    db.commit()
    return {"feedback": row.feedback, "grund": row.feedback_grund}


class AdaptBody(BaseModel):
    anweisung: str = Field(min_length=2, max_length=200)


@router.post("/{recipe_id}/adapt", dependencies=[Depends(require_csrf)])
async def adapt(
    recipe_id: int,
    body: AdaptBody,
    user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
) -> StreamingResponse:
    """Adapt an existing recipe ("schärfer", "vegetarisch", …) — costs one
    generation, streams like /generate, survives client disconnects."""
    source = db.get(Recipe, recipe_id)
    if source is None or source.user_id != user.id:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Rezept nicht gefunden."})

    ratelimit.consume_generation(db, user.id)
    recipe_dict = json.loads(source.recipe_json)
    user_id = user.id
    source_id = source.id
    modus = source.mode
    current_version = ai.prompt_version()
    model = ai.get_settings_model()
    anweisung = " ".join(body.anweisung.split())

    def _finalize(final: dict | None, usage: dict | None) -> dict | None:
        from app.db import SessionLocal

        session = SessionLocal()
        try:
            session.add(
                Generation(
                    user_id=user_id,
                    mode=modus,
                    prompt_version=current_version,
                    model=model,
                    cached=False,
                    status="ok" if final is not None else "error",
                    **(usage or {}),
                )
            )
            session.commit()
            if final is None:
                return None
            row = Recipe(
                user_id=user_id,
                mode=modus,
                params_json=json.dumps(
                    {"adapted_from": source_id, "anweisung": anweisung}, ensure_ascii=False, sort_keys=True
                ),
                recipe_json=json.dumps(final, ensure_ascii=False),
                titel=final.get("titel", ""),
                kueche=final.get("kueche", ""),
                prompt_version=current_version,
                model=model,
            )
            session.add(row)
            session.commit()
            return {"recipe_id": row.id, "cached": False, **ratelimit.get_usage(session, user_id)}
        finally:
            session.close()

    async def event_stream() -> AsyncGenerator[str, None]:
        queue: asyncio.Queue[tuple[str, object] | None] = asyncio.Queue()

        async def produce() -> None:
            final: dict | None = None
            usage: dict | None = None
            failed = False
            try:
                async for name, data in ai.adapt_recipe_events(recipe_dict, anweisung):
                    if name == "usage":
                        usage = data
                        continue
                    if name == "error":
                        failed = True
                    if name == "done":
                        final = data
                    await queue.put((name, data))
                saved = await asyncio.to_thread(_finalize, None if failed else final, usage)
                if saved is not None:
                    await queue.put(("saved", saved))
            except Exception:
                logger.exception("adapt task failed")
                await queue.put(("error", {"code": "generation_failed", "message": "Anpassung fehlgeschlagen."}))
            finally:
                await queue.put(None)

        task = asyncio.create_task(produce())
        _live_tasks.add(task)
        task.add_done_callback(_live_tasks.discard)

        while True:
            item = await queue.get()
            if item is None:
                break
            yield _sse(item[0], item[1])

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


class NotizBody(BaseModel):
    notiz: str = Field(default="", max_length=2000)


@router.patch("/{recipe_id}/notiz", dependencies=[Depends(require_csrf)])
def set_notiz(
    recipe_id: int,
    body: NotizBody,
    user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
) -> dict:
    row = db.get(Recipe, recipe_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Rezept nicht gefunden."})
    row.notiz = body.notiz.strip()
    db.commit()
    return {"notiz": row.notiz}


@router.post("/{recipe_id}/gekocht", dependencies=[Depends(require_csrf)])
def mark_cooked(
    recipe_id: int,
    user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
) -> dict:
    row = db.get(Recipe, recipe_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Rezept nicht gefunden."})
    row.gekocht_count += 1
    db.commit()
    return {"gekocht_count": row.gekocht_count}


class SubstituteBody(BaseModel):
    zutat: str = Field(min_length=1, max_length=60)


@router.post("/{recipe_id}/substitute", dependencies=[Depends(require_csrf)])
async def substitute(
    recipe_id: int,
    body: SubstituteBody,
    request: Request,
    user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
) -> dict:
    """2-3 pantry-realistic substitutes for a missing ingredient (tiny call)."""
    row = db.get(Recipe, recipe_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Rezept nicht gefunden."})
    check_ip_limit(request, scope="substitute", limit=10, window_s=60)
    try:
        return await ai.substitute_options(json.loads(row.recipe_json), body.zutat)
    except Exception:
        logger.exception("substitute failed")
        raise HTTPException(status_code=502, detail={"code": "substitute_failed", "message": "Gerade nicht möglich."})


class FridgeScanBody(BaseModel):
    image: str = Field(min_length=100, max_length=6_000_000)  # base64, ~4.5 MB binary
    media_type: Literal["image/jpeg", "image/png", "image/webp"] = "image/jpeg"


FRIDGE_SCANS_PER_DAY = 5


@router.post("/fridge-scan", dependencies=[Depends(require_csrf)])
async def fridge_scan(
    body: FridgeScanBody,
    request: Request,
    user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
) -> dict:
    """Photo of the fridge -> recognizable ingredients (vision, 5/day/user)."""
    check_ip_limit(request, scope="scan", limit=10, window_s=60)
    ratelimit.consume_scoped(
        db,
        scope=f"scan:{user.id}",
        limit=FRIDGE_SCANS_PER_DAY,
        message="Foto-Scan-Limit für heute erreicht (5 pro Tag).",
    )
    try:
        return await ai.fridge_scan(body.image, body.media_type)
    except Exception:
        logger.exception("fridge scan failed")
        raise HTTPException(status_code=502, detail={"code": "scan_failed", "message": "Scan gerade nicht möglich."})
