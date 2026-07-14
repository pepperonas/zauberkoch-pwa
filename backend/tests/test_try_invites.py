"""Anonymous taster endpoint (/recipes/try). Invite-code signup was removed."""

import pytest

from app.core.config import get_settings
from app.services import ratelimit_ip
from tests.test_generation import PARAMS, logged_in, mock_ai, parse_sse  # noqa: F401


@pytest.fixture(autouse=True)
def _reset_ip_limits():
    ratelimit_ip.reset()
    yield
    ratelimit_ip.reset()


def try_gen(client, params=None):
    return client.post("/api/v1/recipes/try", json=params or PARAMS)


def test_try_streams_without_login(client, mock_ai):
    r = try_gen(client)
    assert r.status_code == 200
    names = [n for n, _ in parse_sse(r.text)]
    assert "meta" in names and "done" in names
    assert "saved" not in names  # nothing is persisted for anonymous users
    assert mock_ai["count"] == 1


def test_try_cache_hits_are_free_and_unlimited(client, mock_ai, monkeypatch):
    monkeypatch.setattr(get_settings(), "daily_limit_anon", 1)
    assert try_gen(client).status_code == 200  # consumes the single anon slot
    for _ in range(3):  # identical params -> shared cache, no budget touched
        assert try_gen(client).status_code == 200
    assert mock_ai["count"] == 1


def test_try_global_anon_budget(client, mock_ai, monkeypatch):
    monkeypatch.setattr(get_settings(), "daily_limit_anon", 1)
    assert try_gen(client).status_code == 200
    r = try_gen(client, {**PARAMS, "kueche": "Thai"})
    assert r.status_code == 429
    assert r.json()["error"]["code"] == "daily_limit_anon"


def test_try_per_ip_limit(client, mock_ai, monkeypatch):
    monkeypatch.setattr(get_settings(), "daily_limit_anon", 50)
    monkeypatch.setattr(get_settings(), "anon_ip_limit", 2)  # cap under test
    assert try_gen(client).status_code == 200
    assert try_gen(client, {**PARAMS, "kueche": "Thai"}).status_code == 200
    assert try_gen(client, {**PARAMS, "kueche": "Indisch"}).status_code == 429  # 2 live/day per IP


def test_try_forces_safe_params(client, mock_ai):
    try_gen(client, {"modus": "cocktail", "personen": 12, "regenerate": True})
    p = mock_ai["last_params"]
    assert p.modus == "kochen"  # no anonymous cocktails (18+ gate needs login)
    assert p.personen == 4
    assert p.regenerate is False


def test_invites_endpoints_are_gone(client, logged_in):  # noqa: F811
    # invite codes were removed when self-service signup opened
    assert client.get("/api/v1/me/invites").status_code == 404
    assert client.get("/api/v1/admin/invites").status_code in (404, 401)
