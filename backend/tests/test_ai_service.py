"""services/ai.py orchestration — faked Anthropic client, zero real API calls.

Covers the pieces the SSE endpoints rely on: event ordering (parser events ->
done -> usage), usage-field mapping incl. None cache counters, the error path
(single terminal error event, no half-finished recipe), adapt's instruction
normalization, and the post-processing of the two small structured calls
(substitute_options / fridge_scan)."""

import asyncio
import json
from types import SimpleNamespace

from app.schemas.recipe import GenerateParams
from app.services import ai

RECIPE = {
    "titel": "Pasta al Limone",
    "teaser": "Cremig-frische Zitronenpasta.",
    "kueche": "Italienisch",
    "tags": ["pasta"],
    "portionen": 2,
    "zeit_aktiv": 15,
    "zeit_gesamt": 20,
    "schwierigkeit": "einfach",
    "zutaten": [
        {"menge": 250, "einheit": "g", "name": "Spaghetti", "gruppe": ""},
        {"menge": 60, "einheit": "g", "name": "Parmesan", "gruppe": ""},
    ],
    "schritte": [
        {"nr": 1, "titel": "Kochen", "text": "Spaghetti kochen.", "dauer_sek": 540},
    ],
    "tipps": ["Pasta-Wasser aufheben."],
    "naehrwerte": {"kalorien_kcal": 560, "eiweiss_g": 21.0, "fett_g": 14.0, "kohlenhydrate_g": 86.0},
    "glas": None,
    "garnitur": None,
}


def make_usage(cache_read=None, cache_write=7):
    return SimpleNamespace(
        input_tokens=1200,
        output_tokens=800,
        cache_read_input_tokens=cache_read,
        cache_creation_input_tokens=cache_write,
    )


class FakeStream:
    """Async context manager mimicking anthropic's MessageStream."""

    def __init__(self, chunks, usage, fail_after=None):
        self._chunks = chunks
        self._usage = usage
        self._fail_after = fail_after

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    @property
    def text_stream(self):
        async def gen():
            for i, chunk in enumerate(self._chunks):
                if self._fail_after is not None and i >= self._fail_after:
                    raise RuntimeError("upstream exploded")
                yield chunk

        return gen()

    async def get_final_message(self):
        return SimpleNamespace(usage=self._usage)


class FakeMessages:
    def __init__(self, stream_result=None, create_message=None):
        self._stream_result = stream_result
        self._create_message = create_message
        self.stream_kwargs = None
        self.create_kwargs = None

    def stream(self, **kwargs):
        self.stream_kwargs = kwargs
        return self._stream_result

    async def create(self, **kwargs):
        self.create_kwargs = kwargs
        return self._create_message


def install_client(monkeypatch, messages):
    monkeypatch.setattr(ai, "_client", SimpleNamespace(messages=messages))
    return messages


def collect(agen):
    async def run():
        return [event async for event in agen]

    return asyncio.run(run())


def chunked(text, size=13):
    return [text[i : i + size] for i in range(0, len(text), size)]


def test_generate_yields_parser_events_then_usage_last(monkeypatch):
    raw = json.dumps(RECIPE, ensure_ascii=False)
    messages = install_client(
        monkeypatch, FakeMessages(stream_result=FakeStream(chunked(raw), make_usage()))
    )

    events = collect(ai.generate_recipe_events(GenerateParams(modus="kochen")))
    names = [n for n, _ in events]

    assert names[0] == "meta"
    assert names.count("zutat") == 2
    assert names.count("schritt") == 1
    assert "error" not in names
    assert names[-2] == "done"
    assert names[-1] == "usage"

    usage = events[-1][1]
    assert usage["input_tokens"] == 1200
    assert usage["output_tokens"] == 800
    assert usage["cache_read_tokens"] == 0  # None -> 0
    assert usage["cache_write_tokens"] == 7
    assert usage["duration_ms"] >= 0
    # The system block must carry cache_control so the prompt cache hits.
    system = messages.stream_kwargs["system"]
    assert system[0]["cache_control"] == {"type": "ephemeral"}
    assert messages.stream_kwargs["output_config"]["format"]["type"] == "json_schema"


def test_generate_maps_stream_failure_to_single_error_event(monkeypatch):
    raw = json.dumps(RECIPE, ensure_ascii=False)
    install_client(
        monkeypatch,
        FakeMessages(stream_result=FakeStream(chunked(raw), make_usage(), fail_after=2)),
    )

    events = collect(ai.generate_recipe_events(GenerateParams(modus="kochen")))
    names = [n for n, _ in events]

    assert names[-1] == "error"
    assert events[-1][1]["code"] == "generation_failed"
    assert "usage" not in names  # never report usage for a failed run
    assert "done" not in names


def test_adapt_normalizes_instruction_and_embeds_recipe(monkeypatch):
    raw = json.dumps(RECIPE, ensure_ascii=False)
    messages = install_client(
        monkeypatch, FakeMessages(stream_result=FakeStream(chunked(raw), make_usage(3, 0)))
    )

    events = collect(ai.adapt_recipe_events(RECIPE, "  schärfer\n\n  bitte\t"))
    names = [n for n, _ in events]

    assert names[-2:] == ["done", "usage"]
    assert events[-1][1]["cache_read_tokens"] == 3
    prompt = messages.stream_kwargs["messages"][0]["content"]
    assert "„schärfer bitte“" in prompt  # collapsed whitespace
    assert '"Pasta al Limone"' in prompt  # recipe JSON embedded un-escaped


def test_adapt_error_path(monkeypatch):
    install_client(
        monkeypatch, FakeMessages(stream_result=FakeStream(["{"], make_usage(), fail_after=0))
    )

    events = collect(ai.adapt_recipe_events(RECIPE, "milder"))

    assert events == [("error", {"code": "generation_failed", "message": "Anpassung fehlgeschlagen."})]


def _text_message(*payloads):
    """Message whose content mixes text and non-text blocks."""
    blocks = [SimpleNamespace(type="text", text=p) for p in payloads]
    blocks.insert(0, SimpleNamespace(type="thinking", text="IGNORED"))
    return SimpleNamespace(content=blocks)


def test_substitute_options_compacts_recipe_and_caps_ingredient(monkeypatch):
    result = {"alternativen": [{"name": "Pecorino", "hinweis": "Etwas salziger."}]}
    messages = install_client(
        monkeypatch,
        FakeMessages(create_message=_text_message(json.dumps(result)[:20], json.dumps(result)[20:])),
    )

    out = asyncio.run(ai.substitute_options(RECIPE, "  Parmesan   " + "x" * 100))

    assert out == result  # joined across text blocks, non-text ignored
    prompt = messages.create_kwargs["messages"][0]["content"]
    assert "Spaghetti" in prompt and "Parmesan" in prompt
    assert "250" not in prompt  # compacted: names only, no amounts
    # normalized + truncated to 60 chars
    zutat_start = prompt.index("Fehlende Zutat")
    assert len("Parmesan " + "x" * 100) > 60
    assert ("Parmesan " + "x" * 51) in prompt[zutat_start:]
    assert "x" * 52 not in prompt


def test_fridge_scan_normalizes_and_caps_ingredients(monkeypatch):
    raw = {"zutaten": ["  Eier ", "", "   ", "Sehr   lange  Paprika " + "y" * 60] + [f"Z{i}" for i in range(25)]}
    messages = install_client(monkeypatch, FakeMessages(create_message=_text_message(json.dumps(raw))))

    out = asyncio.run(ai.fridge_scan("QUJD", "image/jpeg"))

    zutaten = out["zutaten"]
    assert zutaten[0] == "Eier"
    assert "" not in zutaten and "   " not in zutaten
    assert zutaten[1] == ("Sehr lange Paprika " + "y" * 60)[:40]  # whitespace collapsed, 40-char cap
    assert len(zutaten) == 20  # hard cap
    image_block = messages.create_kwargs["messages"][0]["content"][0]
    assert image_block["source"] == {"type": "base64", "media_type": "image/jpeg", "data": "QUJD"}
