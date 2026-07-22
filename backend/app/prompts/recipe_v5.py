"""Recipe system prompt, version 5.

Changes vs v4:
- The avoid list is sent on EVERY generation, not just on explicit re-rolls.
  v4 only attached it when `regenerate` was set AND only listed titles from
  the very same parameter set — but the model's pull towards famous dishes is
  parameter-independent, so asking for "sour, fresh" and later "citrusy,
  refreshing" cheerfully returned the same Daiquiri twice.
- Wording sharpened: a re-worded title or a mere "classic" prefix does not
  count as a different recipe either.

System block is UNCHANGED (re-exported from v3), so the Anthropic prompt
cache keeps hitting across versions.

Released versions are never edited in place; iterate as recipe_v6.py.
"""

from app.prompts.recipe_v1 import _clean
from app.prompts.recipe_v2 import build_user_prompt as _build_v2
from app.prompts.recipe_v3 import SYSTEM_PROMPT  # noqa: F401 (re-export, unchanged)
from app.schemas.recipe import GenerateParams

PROMPT_VERSION = "v5"

# Enough context to steer away from repeats without bloating the user prompt
# (~40 titles ≈ 250 tokens, well under a cent per generation).
MAX_AVOID_TITLES = 40


def build_user_prompt(params: GenerateParams) -> str:
    prompt = _build_v2(params)  # includes the VARIATION_HINT when regenerate
    if params.vermeiden_titel:
        titles = ", ".join(f"„{_clean(t)}“" for t in params.vermeiden_titel[:MAX_AVOID_TITLES])
        prompt += (
            "\n\nDIESE REZEPTE HAT DER NUTZER SCHON: "
            + titles
            + ".\nWähle etwas anderes. Weder einer dieser Titel noch eine Abwandlung davon "
            "zählt als neu — auch nicht mit Zusatz („klassisch“, „einfach“), in anderer "
            "Schreibweise, in anderer Wortstellung oder übersetzt. Wenn die Vorgaben eng "
            "sind, weiche bewusst auf eine weniger naheliegende, aber passende Zubereitung aus."
        )
    return prompt
