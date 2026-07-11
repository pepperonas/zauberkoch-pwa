"""Recipe sharing: unlisted public links, adopt-to-own, dynamic OG image,
and the crawler-facing /r/{token} HTML with injected OG meta tags."""

import html
import json
import logging
import re
import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.core.config import get_settings
from app.core.security import get_current_user, require_csrf
from app.db import get_db
from app.models import Recipe, User
from app.services import og_image
from app.services.ratelimit_ip import check_ip_limit

logger = logging.getLogger("zauberkoch.share")
router = APIRouter()

WEBROOT_INDEX = Path("/var/www/zauberkoch.de/index.html")


def _share_url(token: str) -> str:
    return f"{get_settings().zk_base_url.rstrip('/')}/r/{token}"


def _owned_recipe(recipe_id: int, user: User, db: DbSession) -> Recipe:
    row = db.get(Recipe, recipe_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Rezept nicht gefunden."})
    return row


def _by_token(token: str, db: DbSession) -> Recipe:
    if not token or len(token) > 32:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Link ungültig."})
    row = db.execute(select(Recipe).where(Recipe.share_token == token)).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Link ungültig oder widerrufen."})
    return row


# ---- owner endpoints --------------------------------------------------------

@router.post("/recipes/{recipe_id}/share", dependencies=[Depends(require_csrf)])
def create_share(recipe_id: int, user: User = Depends(get_current_user), db: DbSession = Depends(get_db)) -> dict:
    row = _owned_recipe(recipe_id, user, db)
    if row.share_token is None:
        row.share_token = secrets.token_urlsafe(9)  # 12 url-safe chars
        db.commit()
    return {"share_token": row.share_token, "share_url": _share_url(row.share_token)}


@router.delete("/recipes/{recipe_id}/share", dependencies=[Depends(require_csrf)])
def revoke_share(recipe_id: int, user: User = Depends(get_current_user), db: DbSession = Depends(get_db)) -> dict:
    row = _owned_recipe(recipe_id, user, db)
    if row.share_token is not None:
        og_image.evict(row.share_token)
        row.share_token = None
        db.commit()
    return {"share_token": None}


# ---- public endpoints -------------------------------------------------------

@router.get("/share/{token}")
def get_shared(token: str, request: Request, db: DbSession = Depends(get_db)) -> dict:
    check_ip_limit(request, scope="share", limit=60, window_s=60)
    row = _by_token(token, db)
    return {"mode": row.mode, "recipe": json.loads(row.recipe_json), "share_token": token}


@router.post("/share/{token}/adopt", dependencies=[Depends(require_csrf)])
def adopt_shared(token: str, user: User = Depends(get_current_user), db: DbSession = Depends(get_db)) -> dict:
    source = _by_token(token, db)
    copy = Recipe(
        user_id=user.id,
        mode=source.mode,
        params_json=source.params_json,
        recipe_json=source.recipe_json,
        titel=source.titel,
        kueche=source.kueche,
        prompt_version=source.prompt_version,
        model=source.model,
    )
    db.add(copy)
    db.commit()
    logger.info("recipe adopted src=%s user=%s", source.id, user.id)
    return {"recipe_id": copy.id}


@router.get("/share/{token}/og.png")
def shared_og(token: str, request: Request, db: DbSession = Depends(get_db)) -> FileResponse:
    check_ip_limit(request, scope="share", limit=60, window_s=60)
    row = _by_token(token, db)
    path = og_image.get_or_render(token, json.loads(row.recipe_json), row.mode)
    return FileResponse(path, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})


# ---- crawler-facing HTML (/r/{token}, proxied by nginx, no /api prefix) -----

html_router = APIRouter()

FALLBACK_SHELL = """<!doctype html><html lang="de"><head><meta charset="utf-8"></head>
<body><p>Zauberkoch — <a href="/">zur App</a></p></body></html>"""


# The static index.html carries root-page SEO/OG tags inside this sentinel
# block — it must be stripped here, or crawlers would read the root tags
# (which come first in <head>) instead of the recipe-specific ones.
_ROOT_META_RE = re.compile(r"\s*<!--\s*zk:root-meta:start[^>]*-->.*?<!--\s*zk:root-meta:end\s*-->", re.S)
_TITLE_RE = re.compile(r"<title>.*?</title>", re.S)


def _meta_block(row: Recipe, token: str) -> str:
    settings = get_settings()
    base = settings.zk_base_url.rstrip("/")
    recipe = json.loads(row.recipe_json)
    title = html.escape(f"{recipe.get('titel', 'Rezept')} — Zauberkoch")
    desc = html.escape(recipe.get("teaser", "Ein Rezept vom Zauberkoch."))
    url = f"{base}/r/{token}"
    image = f"{base}/api/v1/share/{token}/og.png"
    return (
        f'<meta name="description" content="{desc}">'
        f'<link rel="canonical" href="{url}">'
        f'<meta property="og:type" content="article">'
        f'<meta property="og:site_name" content="Zauberkoch">'
        f'<meta property="og:locale" content="de_DE">'
        f'<meta property="og:title" content="{title}">'
        f'<meta property="og:description" content="{desc}">'
        f'<meta property="og:url" content="{url}">'
        f'<meta property="og:image" content="{image}">'
        f'<meta property="og:image:width" content="1200">'
        f'<meta property="og:image:height" content="630">'
        f'<meta property="og:image:alt" content="{title}">'
        f'<meta name="twitter:card" content="summary_large_image">'
        f'<meta name="twitter:title" content="{title}">'
        f'<meta name="twitter:description" content="{desc}">'
        f'<meta name="twitter:image" content="{image}">'
    )


def _jsonld(row: Recipe, token: str) -> str:
    """schema.org Recipe JSON-LD for Google Rich Results on shared pages."""
    settings = get_settings()
    base = settings.zk_base_url.rstrip("/")
    r = json.loads(row.recipe_json)

    def amount(z: dict) -> str:
        menge = z.get("menge")
        einheit = z.get("einheit") or ""
        prefix = f"{menge} {einheit}".strip() if menge not in (None, "") else ""
        return f"{prefix} {z.get('name', '')}".strip()

    data: dict = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        "name": r.get("titel", ""),
        "description": r.get("teaser", ""),
        "image": [f"{base}/api/v1/share/{token}/og.png"],
        "inLanguage": "de",
        "author": {"@type": "Organization", "name": "Zauberkoch", "url": base},
        "datePublished": row.created_at.date().isoformat(),
        "recipeCuisine": r.get("kueche", ""),
        "keywords": ", ".join(r.get("tags", [])),
        "recipeYield": f"{r.get('portionen', 1)} {'Drinks' if row.mode == 'cocktail' else 'Portionen'}",
        "prepTime": f"PT{int(r.get('zeit_aktiv') or 0)}M",
        "totalTime": f"PT{int(r.get('zeit_gesamt') or 0)}M",
        "recipeIngredient": [amount(z) for z in r.get("zutaten", [])],
        "recipeInstructions": [
            {"@type": "HowToStep", "name": s_.get("titel", ""), "text": s_.get("text", "")}
            for s_ in r.get("schritte", [])
        ],
    }
    naehrwerte = r.get("naehrwerte") or {}
    if naehrwerte.get("kalorien_kcal") is not None:
        data["nutrition"] = {
            "@type": "NutritionInformation",
            "calories": f"{naehrwerte['kalorien_kcal']} kcal",
            "proteinContent": f"{naehrwerte.get('eiweiss_g', 0)} g",
            "fatContent": f"{naehrwerte.get('fett_g', 0)} g",
            "carbohydrateContent": f"{naehrwerte.get('kohlenhydrate_g', 0)} g",
        }
    # "</" would end the script tag early — escape for safe inline embedding
    payload = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    return f'<script type="application/ld+json">{payload}</script>'


@html_router.get("/r/{token}", response_class=HTMLResponse)
def shared_page(token: str, request: Request, db: DbSession = Depends(get_db)) -> HTMLResponse:
    check_ip_limit(request, scope="share", limit=60, window_s=60)
    row = _by_token(token, db)
    shell = WEBROOT_INDEX.read_text(encoding="utf-8") if WEBROOT_INDEX.exists() else FALLBACK_SHELL
    shell = _ROOT_META_RE.sub("", shell)
    page_title = html.escape(f"{json.loads(row.recipe_json).get('titel', 'Rezept')} — Zauberkoch")
    shell = _TITLE_RE.sub(f"<title>{page_title}</title>", shell, count=1)
    page = shell.replace("</head>", f"{_meta_block(row, token)}{_jsonld(row, token)}</head>", 1)
    return HTMLResponse(page, headers={"Cache-Control": "no-cache"})
