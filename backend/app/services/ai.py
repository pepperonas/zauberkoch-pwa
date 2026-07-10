"""Anthropic recipe generation — the ONLY module that talks to the Anthropic API.

Streams the model output through the incremental parser and yields semantic
events. Thinking is explicitly disabled: time-to-first-token is the UX
centerpiece (the recipe builds up live), and the system prompt carries the
quality requirements.
"""

import logging
from collections.abc import AsyncGenerator

from anthropic import AsyncAnthropic

from app.core.config import get_settings
from app.prompts.recipe_v1 import PROMPT_VERSION, SYSTEM_PROMPT, build_user_prompt
from app.schemas.recipe import GenerateParams
from app.services.json_stream import Event, RecipeStreamParser

logger = logging.getLogger("zauberkoch.ai")

_client: AsyncAnthropic | None = None


def get_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        _client = AsyncAnthropic(api_key=get_settings().anthropic_api_key)
    return _client


async def generate_recipe_events(params: GenerateParams) -> AsyncGenerator[Event, None]:
    settings = get_settings()
    parser = RecipeStreamParser()
    try:
        async with get_client().messages.stream(
            model=settings.anthropic_model,
            max_tokens=settings.anthropic_max_tokens,
            thinking={"type": "disabled"},
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": build_user_prompt(params)}],
        ) as stream:
            async for text in stream.text_stream:
                for event in parser.feed(text):
                    yield event
    except Exception:
        logger.exception("anthropic stream failed")
        yield ("error", {"code": "generation_failed", "message": "Generierung fehlgeschlagen."})
        return
    for event in parser.finish():
        yield event


def prompt_version() -> str:
    return PROMPT_VERSION


def get_settings_model() -> str:
    return get_settings().anthropic_model
