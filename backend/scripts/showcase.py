"""Seed the public landing-page gallery: three curated, REAL generations
under a dedicated showcase user, each with a share token. Idempotent.

Usage (on the VPS): .venv/bin/python -m scripts.showcase
Costs ~3 generations against the Anthropic API on first run.
"""

import asyncio
import json
import secrets

from sqlalchemy import select

from app.db import SessionLocal
from app.models import Recipe, User
from app.schemas.recipe import GenerateParams
from app.services import ai

SHOWCASE = [
    ("showcase-1", GenerateParams(modus="kochen", kueche="Italienisch", geschmack=["frisch", "herzhaft"], personen=2, max_zeit_min=30)),
    ("showcase-2", GenerateParams(modus="kochen", kueche="Thai", geschmack=["scharf", "cremig"], personen=2)),
    ("showcase-3", GenerateParams(modus="cocktail", basis_spirituose="Gin", geschmack=["frisch", "sauer"], personen=2)),
]


async def main() -> int:
    db = SessionLocal()
    try:
        user = db.execute(select(User).where(User.google_sub == "showcase-system")).scalar_one_or_none()
        if user is None:
            user = User(google_sub="showcase-system", email="showcase@zauberkoch.local", name="Zauberkoch")
            db.add(user)
            db.commit()

        for key, params in SHOWCASE:
            marker = json.dumps({"showcase": key})
            existing = db.execute(
                select(Recipe).where(Recipe.user_id == user.id, Recipe.params_json == marker)
            ).scalar_one_or_none()
            if existing is not None:
                print(f"{key}: exists  https://zauberkoch.de/r/{existing.share_token}  ({existing.titel})")
                continue

            final = None
            async for name, data in ai.generate_recipe_events(params):
                if name == "done":
                    final = data
                elif name == "error":
                    print(f"{key}: FAILED {data}")
            if final is None:
                return 1
            row = Recipe(
                user_id=user.id,
                mode=params.modus,
                params_json=marker,
                recipe_json=json.dumps(final, ensure_ascii=False),
                titel=final.get("titel", ""),
                kueche=final.get("kueche", ""),
                prompt_version=ai.prompt_version(),
                model=ai.get_settings_model(),
                share_token=secrets.token_urlsafe(9),
            )
            db.add(row)
            db.commit()
            print(f"{key}: created https://zauberkoch.de/r/{row.share_token}  ({row.titel})")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
