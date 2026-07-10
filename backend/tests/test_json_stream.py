"""Incremental parser: token chunks in -> semantic events out."""

import json

from app.services.json_stream import RecipeStreamParser, replay_events

RECIPE = {
    "titel": "Pasta al Limone",
    "teaser": "Cremig-frische Zitronenpasta.",
    "kueche": "Italienisch",
    "tags": ["pasta", "schnell"],
    "portionen": 2,
    "zeit_aktiv": 15,
    "zeit_gesamt": 20,
    "schwierigkeit": "einfach",
    "zutaten": [
        {"menge": 250, "einheit": "g", "name": "Spaghetti", "gruppe": ""},
        {"menge": 1, "einheit": "Stück", "name": "Bio-Zitrone", "gruppe": ""},
        {"menge": 60, "einheit": "g", "name": "Parmesan", "gruppe": ""},
    ],
    "schritte": [
        {"nr": 1, "titel": "Kochen", "text": "Spaghetti in Salzwasser kochen.", "dauer_sek": 540},
        {"nr": 2, "titel": "Mischen", "text": "Mit Zitrone und Parmesan mischen.", "dauer_sek": None},
    ],
    "tipps": ["Pasta-Wasser aufheben — die Stärke bindet die Sauce."],
    "naehrwerte": {"kalorien_kcal": 560, "eiweiss_g": 21.0, "fett_g": 14.0, "kohlenhydrate_g": 86.0},
    "glas": None,
    "garnitur": None,
}


def stream_in_chunks(text: str, size: int):
    parser = RecipeStreamParser()
    events = []
    for i in range(0, len(text), size):
        events += parser.feed(text[i : i + size])
    events += parser.finish()
    return events


def test_full_stream_small_chunks():
    raw = json.dumps(RECIPE, ensure_ascii=False)
    events = stream_in_chunks(raw, 7)
    names = [n for n, _ in events]

    assert names.count("meta") == 1
    assert names.count("zutat") == 3
    assert names.count("schritt") == 2
    assert names.count("tipp") == 1
    assert names[-1] == "done"
    assert "error" not in names

    meta = dict(events)["meta"]
    assert meta["titel"] == "Pasta al Limone"
    assert meta["portionen"] == 2

    done = events[-1][1]
    assert done["zutaten"][2]["name"] == "Parmesan"


def test_meta_comes_before_first_zutat():
    raw = json.dumps(RECIPE, ensure_ascii=False)
    events = stream_in_chunks(raw, 3)
    names = [n for n, _ in events]
    assert names.index("meta") < names.index("zutat")


def test_events_identical_regardless_of_chunk_size():
    raw = json.dumps(RECIPE, ensure_ascii=False)
    a = stream_in_chunks(raw, 1)
    b = stream_in_chunks(raw, 500)
    assert [n for n, _ in a] == [n for n, _ in b]
    assert a[-1][1] == b[-1][1]


def test_markdown_fences_are_tolerated():
    raw = "```json\n" + json.dumps(RECIPE, ensure_ascii=False) + "\n```"
    events = stream_in_chunks(raw, 11)
    assert events[-1][0] == "done"


def test_invalid_json_yields_error():
    parser = RecipeStreamParser()
    parser.feed('{"titel": "kaputt", "zutaten": [')
    events = parser.finish()
    assert events[-1][0] == "error"


def test_incomplete_last_item_not_emitted_early():
    raw = json.dumps(RECIPE, ensure_ascii=False)
    cut = raw.find('"Parmesan"') + len('"Parmesan"')  # third ingredient still open
    parser = RecipeStreamParser()
    events = parser.feed(raw[:cut])
    assert [n for n, _ in events].count("zutat") == 2  # third is incomplete


def test_replay_matches_live_event_shape():
    live = stream_in_chunks(json.dumps(RECIPE, ensure_ascii=False), 9)
    replay = replay_events(RECIPE)
    assert [n for n, _ in live] == [n for n, _ in replay]
