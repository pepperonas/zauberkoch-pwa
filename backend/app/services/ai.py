"""Anthropic recipe generation — the ONLY module that talks to the Anthropic API.

- Prompt v2 with few-shot examples; the system block carries cache_control
  so repeated generations read the prompt from the prompt cache (~90% cheaper
  input, faster TTFT). The system prompt must stay byte-stable — volatile
  content goes into the user prompt.
- Structured outputs (output_config.format) guarantee schema-valid JSON.
- Thinking stays disabled: time-to-first-token is the UX centerpiece.
- After the recipe events, a final internal ("usage", {...}) event reports
  token counts and timing for persistence (never forwarded to the client).
"""

import logging
import time
from collections.abc import AsyncGenerator

from anthropic import AsyncAnthropic

from app.core.config import get_settings
from app.prompts.recipe_v3 import PROMPT_VERSION, SYSTEM_PROMPT, build_user_prompt
from app.schemas.recipe import GenerateParams, recipe_llm_schema
from app.services.json_stream import Event, RecipeStreamParser

logger = logging.getLogger("zauberkoch.ai")

_client: AsyncAnthropic | None = None
_LLM_SCHEMA = recipe_llm_schema()


def get_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        _client = AsyncAnthropic(api_key=get_settings().anthropic_api_key)
    return _client


async def generate_recipe_events(params: GenerateParams) -> AsyncGenerator[Event, None]:
    settings = get_settings()
    parser = RecipeStreamParser()
    started = time.monotonic()
    usage_event: Event | None = None
    try:
        async with get_client().messages.stream(
            model=settings.anthropic_model,
            max_tokens=settings.anthropic_max_tokens,
            thinking={"type": "disabled"},
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            output_config={"format": {"type": "json_schema", "schema": _LLM_SCHEMA}},
            messages=[{"role": "user", "content": build_user_prompt(params)}],
        ) as stream:
            async for text in stream.text_stream:
                for event in parser.feed(text):
                    yield event
            final = await stream.get_final_message()
            usage = final.usage
            usage_event = (
                "usage",
                {
                    "input_tokens": usage.input_tokens,
                    "output_tokens": usage.output_tokens,
                    "cache_read_tokens": usage.cache_read_input_tokens or 0,
                    "cache_write_tokens": usage.cache_creation_input_tokens or 0,
                    "duration_ms": int((time.monotonic() - started) * 1000),
                },
            )
    except Exception:
        logger.exception("anthropic stream failed")
        yield ("error", {"code": "generation_failed", "message": "Generierung fehlgeschlagen."})
        return
    for event in parser.finish():
        yield event
    if usage_event is not None:
        yield usage_event


def prompt_version() -> str:
    return PROMPT_VERSION


def get_settings_model() -> str:
    return get_settings().anthropic_model
