"""Recipe system prompt, version 4.

Changes vs v3:
- Variation requests list the titles the user already received for these
  params (avoid list, injection-guarded like all user text) so re-rolls
  differ meaningfully instead of by luck. System block is UNCHANGED — the
  Anthropic prompt cache keeps hitting across versions.

Released versions are never edited in place; iterate as recipe_v5.py.
"""

from app.prompts.recipe_v1 import _clean
from app.prompts.recipe_v2 import build_user_prompt as _build_v2
from app.prompts.recipe_v3 import SYSTEM_PROMPT  # noqa: F401 (re-export, unchanged)
from app.schemas.recipe import GenerateParams

PROMPT_VERSION = "v4"


def build_user_prompt(params: GenerateParams) -> str:
    prompt = _build_v2(params)  # includes the VARIATION_HINT when regenerate
    if params.regenerate and params.vermeiden_titel:
        titles = ", ".join(f"„{_clean(t)}“" for t in params.vermeiden_titel)
        prompt += (
            "\nBereits erhalten: "
            + titles
            + " — dein neues Rezept muss sich davon deutlich unterscheiden "
            + "(anderes Hauptelement oder andere Zubereitungsart)."
        )
    return prompt
