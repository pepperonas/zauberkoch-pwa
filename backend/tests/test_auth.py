"""Auth flow tests — Google endpoints are mocked, no real network calls."""

import time
from urllib.parse import parse_qs, urlparse

import pytest

from app.core.config import get_settings
from app.services import google_oauth, ratelimit_ip


@pytest.fixture(autouse=True)
def _reset_ip_limits():
    ratelimit_ip.reset()
    yield
    ratelimit_ip.reset()


def fake_claims(email="alice@example.com", sub="sub-123"):
    return {
        "aud": get_settings().google_client_id,
        "iss": "https://accounts.google.com",
        "exp": time.time() + 3600,
        "sub": sub,
        "email": email,
        "email_verified": True,
        "name": "Alice",
        "picture": "https://example.com/p.png",
    }


def do_login_callback(client, monkeypatch, claims=None):
    """Run the full login → callback flow with a mocked token exchange."""
    claims = claims or fake_claims()
    r = client.get("/api/v1/auth/login", follow_redirects=False)
    assert r.status_code == 307
    query = parse_qs(urlparse(r.headers["location"]).query)
    state = query["state"][0]
    assert query["code_challenge_method"] == ["S256"]

    monkeypatch.setattr(google_oauth, "exchange_code", lambda code, verifier: {"id_token": "fake"})
    monkeypatch.setattr(google_oauth, "parse_id_token", lambda tok: claims)
    return client.get(f"/api/v1/auth/callback?code=abc&state={state}", follow_redirects=False)


def add_to_allowlist(db_session, email):
    from app.models import AllowlistEntry

    db_session.add(AllowlistEntry(email=email))
    db_session.commit()


def test_login_redirects_to_google(client):
    r = client.get("/api/v1/auth/login", follow_redirects=False)
    assert r.status_code == 307
    assert r.headers["location"].startswith("https://accounts.google.com/o/oauth2/v2/auth?")
    assert "zk_oauth" in r.cookies


def test_callback_rejects_unknown_email_when_signup_closed(client, monkeypatch):
    r = do_login_callback(client, monkeypatch)
    assert r.status_code == 303
    assert "login_error=not_allowed" in r.headers["location"]


def test_callback_creates_user_from_allowlist(client, db_session, monkeypatch):
    add_to_allowlist(db_session, "alice@example.com")
    r = do_login_callback(client, monkeypatch)
    assert r.status_code == 303
    assert "login_error" not in r.headers["location"]

    me = client.get("/api/v1/me")
    assert me.status_code == 200
    body = me.json()
    assert body["email"] == "alice@example.com"
    assert body["adult_confirmed"] is False
    assert body["csrf_token"]


def test_existing_user_can_login_without_allowlist(client, db_session, monkeypatch):
    from app.models import User

    db_session.add(User(google_sub="sub-123", email="alice@example.com"))
    db_session.commit()
    r = do_login_callback(client, monkeypatch)
    assert "login_error" not in r.headers["location"]
    assert client.get("/api/v1/me").status_code == 200


def test_callback_rejects_state_mismatch(client, monkeypatch):
    client.get("/api/v1/auth/login", follow_redirects=False)
    monkeypatch.setattr(google_oauth, "exchange_code", lambda code, verifier: {"id_token": "fake"})
    r = client.get("/api/v1/auth/callback?code=abc&state=WRONG", follow_redirects=False)
    assert "login_error=state_mismatch" in r.headers["location"]


def test_me_requires_session(client):
    r = client.get("/api/v1/me")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "unauthorized"


def test_confirm_adult_requires_csrf(client, db_session, monkeypatch):
    add_to_allowlist(db_session, "alice@example.com")
    do_login_callback(client, monkeypatch)

    r = client.post("/api/v1/me/confirm-adult")
    assert r.status_code == 403

    csrf = client.get("/api/v1/me").json()["csrf_token"]
    r = client.post("/api/v1/me/confirm-adult", headers={"X-CSRF-Token": csrf})
    assert r.status_code == 200
    assert client.get("/api/v1/me").json()["adult_confirmed"] is True


def test_logout_clears_session(client, db_session, monkeypatch):
    add_to_allowlist(db_session, "alice@example.com")
    do_login_callback(client, monkeypatch)
    csrf = client.get("/api/v1/me").json()["csrf_token"]

    r = client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": csrf})
    assert r.status_code == 204
    assert client.get("/api/v1/me").status_code == 401


def test_auth_ip_rate_limit(client):
    for _ in range(20):
        client.get("/api/v1/auth/login", follow_redirects=False)
    r = client.get("/api/v1/auth/login", follow_redirects=False)
    assert r.status_code == 429
    assert r.json()["error"]["code"] == "rate_limited"


def test_expired_session_rejected(client, db_session, monkeypatch):
    from datetime import datetime, timedelta, timezone

    from app.models import Session as SessionModel

    add_to_allowlist(db_session, "alice@example.com")
    do_login_callback(client, monkeypatch)
    sess = db_session.query(SessionModel).first()
    sess.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    db_session.commit()

    assert client.get("/api/v1/me").status_code == 401
