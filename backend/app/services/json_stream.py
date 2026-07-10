"""Incremental recipe-JSON parser.

Turns the raw model token stream into semantic events so the frontend can
render the recipe while it is being generated:

    ("meta", {...})      title/teaser/kueche/tags/times — once, early
    ("zutat", {...})     one completed ingredient at a time
    ("schritt", {...})   one completed step at a time
    ("tipp", "...")      one completed tip at a time
    ("done", {...})      the full validated recipe
    ("error", {...})     stream ended without valid JSON

Strategy: keep the growing buffer, "repair" it into parseable JSON by
closing open strings/brackets, parse, and emit everything that is provably
complete. An array item counts as complete when a later item exists or the
next top-level key (fixed order enforced by the prompt) has appeared.
"""

import json
from typing import Any

from pydantic import ValidationError

from app.schemas.recipe import Recipe

Event = tuple[str, Any]

META_KEYS = ["titel", "teaser", "kueche", "tags", "portionen", "zeit_aktiv", "zeit_gesamt", "schwierigkeit"]
# array key -> the key whose appearance proves the array is closed
ARRAY_NEXT_KEY = {"zutaten": '"schritte"', "schritte": '"tipps"', "tipps": '"naehrwerte"'}
ARRAY_EVENT = {"zutaten": "zutat", "schritte": "schritt", "tipps": "tipp"}


def _strip_prefix(buffer: str) -> str:
    """Drop anything before the first '{' (stray text, markdown fences)."""
    idx = buffer.find("{")
    return buffer[idx:] if idx >= 0 else ""


def _repair(buffer: str) -> str | None:
    """Close open strings/brackets so the prefix becomes parseable JSON."""
    stack: list[str] = []
    in_string = False
    escape = False
    for ch in buffer:
        if escape:
            escape = False
            continue
        if in_string:
            if ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch in "{[":
            stack.append(ch)
        elif ch in "}]":
            if stack:
                stack.pop()
    closure = '"' if in_string else ""
    for opener in reversed(stack):
        closure += "}" if opener == "{" else "]"
    return buffer + closure


class RecipeStreamParser:
    def __init__(self) -> None:
        self.buffer = ""
        self._meta_sent = False
        self._sent = {k: 0 for k in ARRAY_NEXT_KEY}
        self._finished = False

    def feed(self, chunk: str) -> list[Event]:
        if self._finished:
            return []
        self.buffer += chunk
        return self._extract(final=False)

    def finish(self) -> list[Event]:
        """Call when the model stream ends: flush remainder + done/error."""
        if self._finished:
            return []
        self._finished = True
        events = self._extract(final=True)

        raw = _strip_prefix(self.buffer)
        end = raw.rfind("}")
        if end >= 0:
            raw = raw[: end + 1]
        try:
            recipe = Recipe.model_validate(json.loads(raw))
        except (ValueError, json.JSONDecodeError, ValidationError) as exc:
            events.append(("error", {"code": "invalid_recipe", "message": f"{type(exc).__name__}"}))
            return events
        events.append(("done", recipe.model_dump()))
        return events

    # -- internals ---------------------------------------------------------

    def _extract(self, *, final: bool) -> list[Event]:
        cleaned = _strip_prefix(self.buffer)
        if not cleaned:
            return []
        repaired = _repair(cleaned)
        try:
            parsed = json.loads(repaired)
        except (ValueError, json.JSONDecodeError):
            return []  # buffer ends mid-token (number, literal) — wait for more
        if not isinstance(parsed, dict):
            return []

        events: list[Event] = []

        if not self._meta_sent and ('"zutaten"' in cleaned or final):
            if parsed.get("titel"):
                events.append(("meta", {k: parsed.get(k) for k in META_KEYS}))
                self._meta_sent = True

        for key, next_key in ARRAY_NEXT_KEY.items():
            arr = parsed.get(key)
            if not isinstance(arr, list):
                continue
            closed = final or next_key in cleaned
            limit = len(arr) if closed else max(len(arr) - 1, 0)
            while self._sent[key] < limit:
                events.append((ARRAY_EVENT[key], arr[self._sent[key]]))
                self._sent[key] += 1

        return events


def replay_events(recipe: dict) -> list[Event]:
    """Produce the same event sequence from a stored recipe (cache hits)."""
    events: list[Event] = [("meta", {k: recipe.get(k) for k in META_KEYS})]
    events += [("zutat", z) for z in recipe.get("zutaten", [])]
    events += [("schritt", s) for s in recipe.get("schritte", [])]
    events += [("tipp", t) for t in recipe.get("tipps", [])]
    events.append(("done", recipe))
    return events
