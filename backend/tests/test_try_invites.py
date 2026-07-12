"""Anonymous taster endpoint (/recipes/try) + invite-code signup."""

import pytest

from app.core.config import get_settings
from app.services import ratelimit_ip
from tests.test_auth import do_login_callback, fake_claims
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
    assert try_gen(client).status_code == 200
    assert try_gen(client, {**PARAMS, "kueche": "Thai"}).status_code == 200
    assert try_gen(client, {**PARAMS, "kueche": "Indisch"}).status_code == 429  # 2 live/day per IP


def test_try_forces_safe_params(client, mock_ai):
    try_gen(client, {"modus": "cocktail", "personen": 12, "regenerate": True})
    p = mock_ai["last_params"]
    assert p.modus == "kochen"  # no anonymous cocktails (18+ gate needs login)
    assert p.personen == 4
    assert p.regenerate is False


def test_no_public_invite_oracle(client):
    # invite validity must not be probeable without an OAuth flow
    assert client.get("/api/v1/auth/invite/zk-abcdefghjkmnp").status_code == 404


def test_invites_provisioned_and_signup_flow(client, db_session, logged_in, monkeypatch):  # noqa: F811
    codes = client.get("/api/v1/me/invites").json()["items"]
    assert len(codes) == 5
    assert all(not c["used"] for c in codes)
    code = codes[0]["code"]
    assert len(code) >= 15  # >= 64 bits of entropy ("zk-" + 13 chars)

    # bob is NOT allowlisted, but carries the invite code
    r = do_login_callback(client, monkeypatch, claims=fake_claims(email="bob@example.com", sub="sub-bob"), invite=code)
    assert "login_error" not in r.headers["location"]
    assert client.get("/api/v1/me").json()["email"] == "bob@example.com"

    # single-use: same code must not work again
    r = do_login_callback(client, monkeypatch, claims=fake_claims(email="carol@example.com", sub="sub-c"), invite=code)
    assert "login_error=not_allowed" in r.headers["location"]

    # bob's invite shows as used for alice
    do_login_callback(client, monkeypatch)  # back to alice
    used = [c for c in client.get("/api/v1/me/invites").json()["items"] if c["used"]]
    assert len(used) == 1 and used[0]["code"] == code
