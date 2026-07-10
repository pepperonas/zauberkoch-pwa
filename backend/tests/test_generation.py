"""Generation endpoint: SSE, cache, rate limits, adult gate. AI fully mocked."""

import json

import pytest

from app.schemas.recipe import GenerateParams
from app.services import ratelimit_ip
from tests.test_auth import add_to_allowlist, do_login_callback
from tests.test_json_stream import RECIPE


@pytest.fixture(autouse=True)
def _reset_ip_limits():
    ratelimit_ip.reset()
    yield
    ratelimit_ip.reset()


@pytest.fixture()
def logged_in(client, db_session, monkeypatch):
    add_to_allowlist(db_session, "alice@example.com")
    do_login_callback(client, monkeypatch)
    csrf = client.get("/api/v1/me").json()["csrf_token"]
    # confirm 18+ so cocktail tests work too
    client.post("/api/v1/me/confirm-adult", headers={"X-CSRF-Token": csrf})
    return {"X-CSRF-Token": csrf}


@pytest.fixture()
def mock_ai(monkeypatch):
    """Replace the Anthropic stream with a deterministic event sequence."""
    from app.api.v1 import recipes as recipes_module
    from app.services.json_stream import replay_events

    calls = {"count": 0}

    async def fake_events(params: GenerateParams):
        calls["count"] += 1
        recipe = dict(RECIPE)
        if params.regenerate:
            recipe = {**RECIPE, "titel": "Variante: " + RECIPE["titel"]}
        for ev in replay_events(recipe):
            yield ev
        yield (
            "usage",
            {"input_tokens": 3000, "output_tokens": 900, "cache_read_tokens": 2500, "cache_write_tokens": 0, "duration_ms": 4200},
        )

    monkeypatch.setattr(recipes_module.ai, "generate_recipe_events", fake_events)
    return calls


PARAMS = {"modus": "kochen", "kueche": "Italienisch", "geschmack": ["frisch"], "personen": 2}


def parse_sse(text: str) -> list[tuple[str, dict]]:
    events = []
    for block in text.strip().split("\n\n"):
        lines = dict(line.split(": ", 1) for line in block.split("\n") if ": " in line)
        if "event" in lines:
            events.append((lines["event"], json.loads(lines["data"])))
    return events


def generate(client, headers, params=None):
    r = client.post("/api/v1/recipes/generate", json=params or PARAMS, headers=headers)
    assert r.status_code == 200, r.text
    return parse_sse(r.text)


def test_generate_streams_semantic_events(client, logged_in, mock_ai):
    events = generate(client, logged_in)
    names = [n for n, _ in events]
    assert names[0] == "meta"
    assert "done" in names
    assert "usage" not in names  # internal event must never reach the client
    assert names[-1] == "saved"
    saved = events[-1][1]
    assert saved["cached"] is False
    assert saved["remaining"] == 19  # one of 20 consumed


def test_generate_requires_csrf(client, logged_in, mock_ai):
    r = client.post("/api/v1/recipes/generate", json=PARAMS)
    assert r.status_code == 403


def test_cache_hit_is_free_and_replayed(client, logged_in, mock_ai):
    generate(client, logged_in)
    events = generate(client, logged_in)  # identical params -> cache
    saved = events[-1][1]
    assert saved["cached"] is True
    assert saved["remaining"] == 19  # unchanged, cache hits are free
    assert mock_ai["count"] == 1


def test_regenerate_bypasses_cache(client, logged_in, mock_ai):
    generate(client, logged_in)
    events = generate(client, logged_in, {**PARAMS, "regenerate": True})
    saved = events[-1][1]
    assert saved["cached"] is False
    assert mock_ai["count"] == 2
    meta = dict(events)["meta"]
    assert meta["titel"].startswith("Variante:")


def test_user_daily_limit(client, logged_in, mock_ai, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "daily_limit_per_user", 2)
    generate(client, logged_in)
    generate(client, logged_in, {**PARAMS, "personen": 3})
    r = client.post("/api/v1/recipes/generate", json={**PARAMS, "personen": 4}, headers=logged_in)
    assert r.status_code == 429
    body = r.json()["error"]
    assert body["code"] == "daily_limit_user"
    assert body["retry_after"] > 0


def test_global_daily_limit(client, logged_in, mock_ai, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "daily_limit_global", 1)
    generate(client, logged_in)
    r = client.post("/api/v1/recipes/generate", json={**PARAMS, "personen": 5}, headers=logged_in)
    assert r.status_code == 429
    assert r.json()["error"]["code"] == "daily_limit_global"


def test_cocktail_requires_adult_confirmation(client, db_session, monkeypatch, mock_ai):
    add_to_allowlist(db_session, "bob@example.com")
    from tests.test_auth import fake_claims

    do_login_callback(client, monkeypatch, claims=fake_claims(email="bob@example.com", sub="sub-bob"))
    csrf = client.get("/api/v1/me").json()["csrf_token"]
    r = client.post(
        "/api/v1/recipes/generate",
        json={"modus": "cocktail", "basis_spirituose": "Gin"},
        headers={"X-CSRF-Token": csrf},
    )
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "adult_required"


def test_history_and_detail(client, logged_in, mock_ai):
    events = generate(client, logged_in)
    recipe_id = events[-1][1]["recipe_id"]

    listing = client.get("/api/v1/recipes").json()
    assert len(listing["items"]) == 1
    assert listing["items"][0]["titel"] == RECIPE["titel"]

    search = client.get("/api/v1/recipes?q=limone").json()
    assert len(search["items"]) == 1
    assert client.get("/api/v1/recipes?q=nichtda").json()["items"] == []

    detail = client.get(f"/api/v1/recipes/{recipe_id}").json()
    assert detail["recipe"]["titel"] == RECIPE["titel"]
    assert detail["is_favorite"] is False


def test_generation_usage_is_logged(client, db_session, logged_in, mock_ai):
    from app.models import Generation

    generate(client, logged_in)          # live call
    generate(client, logged_in)          # identical params -> cache hit
    rows = db_session.query(Generation).order_by(Generation.id).all()
    assert len(rows) == 2
    live, hit = rows
    assert live.cached is False and live.input_tokens == 3000 and live.cache_read_tokens == 2500
    assert live.duration_ms == 4200 and live.status == "ok"
    assert hit.cached is True and hit.input_tokens == 0


def test_recipe_of_other_user_is_hidden(client, db_session, logged_in, mock_ai):
    events = generate(client, logged_in)
    recipe_id = events[-1][1]["recipe_id"]

    from app.models import Recipe, User

    other = User(google_sub="sub-other", email="other@example.com")
    db_session.add(other)
    db_session.flush()
    row = db_session.get(Recipe, recipe_id)
    row.user_id = other.id
    db_session.commit()

    assert client.get(f"/api/v1/recipes/{recipe_id}").status_code == 404
