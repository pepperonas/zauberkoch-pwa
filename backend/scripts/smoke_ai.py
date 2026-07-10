"""Manual smoke test against the real Anthropic API — costs ~1 recipe of tokens.

Usage: ANTHROPIC_API_KEY=... .venv/bin/python -m scripts.smoke_ai [cocktail]
"""

import asyncio
import sys

from app.schemas.recipe import GenerateParams
from app.services.ai import generate_recipe_events


async def main() -> int:
    if len(sys.argv) > 1 and sys.argv[1] == "cocktail":
        params = GenerateParams(modus="cocktail", basis_spirituose="Gin", geschmack=["frisch", "sauer"], personen=2)
    else:
        params = GenerateParams(modus="kochen", kueche="Italienisch", geschmack=["frisch"], personen=2, max_zeit_min=30)

    counts = {"meta": 0, "zutat": 0, "schritt": 0, "tipp": 0, "done": 0, "error": 0}
    async for name, data in generate_recipe_events(params):
        counts[name] = counts.get(name, 0) + 1
        if name == "meta":
            print(f"META   {data['titel']} — {data['kueche']}, {data['portionen']} Port., {data['zeit_gesamt']} min")
        elif name == "zutat":
            print(f"ZUTAT  {data.get('menge')} {data.get('einheit')} {data.get('name')}")
        elif name == "schritt":
            print(f"SCHRITT {data.get('nr')}. {data.get('titel')}")
        elif name == "tipp":
            print(f"TIPP   {data}")
        elif name == "error":
            print(f"ERROR  {data}")
        elif name == "done":
            print(f"DONE   schwierigkeit={data.get('schwierigkeit')} naehrwerte={'ja' if data.get('naehrwerte') else 'nein'}")

    ok = counts["done"] == 1 and counts["error"] == 0 and counts["zutat"] >= 3 and counts["schritt"] >= 2
    print(f"\n{'✔ SMOKE OK' if ok else '✘ SMOKE FAILED'}  {counts}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
