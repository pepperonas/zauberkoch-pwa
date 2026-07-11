"""Admin panel: access control, stats shape, allowlist management."""

import pytest

from app.core.config import get_settings
from app.services import ratelimit_ip
from tests.test_auth import add_to_allowlist, do_login_callback, fake_claims
from tests.test_generation import PARAMS, generate, logged_in, mock_ai  # noqa: F401


@pytest.fixture(autouse=True)
def _reset_ip_limits():
    ratelimit_ip.reset()
    yield
    ratelimit_ip.reset()


@pytest.fixture()
def admin(client, db_session, monkeypatch):
    monkeypatch.setattr(get_settings(), "zk_admin_emails", "Admin@Example.com")
    add_to_allowlist(db_session, "admin@example.com")
    do_login_callback(client, monkeypatch, claims=fake_claims(email="admin@example.com", sub="sub-admin"))
    me = client.get("/api/v1/me").json()
    assert me["is_admin"] is True
    return {"X-CSRF-Token": me["csrf_token"]}


def test_admin_endpoints_are_404_for_normal_users(client, logged_in, mock_ai):
    assert client.get("/api/v1/me").json()["is_admin"] is False
    assert client.get("/api/v1/admin/stats").status_code == 404
    assert client.get("/api/v1/admin/allowlist").status_code == 404
    assert client.post("/api/v1/admin/allowlist", json={"email": "x@y.de"}, headers=logged_in).status_code == 404


def test_admin_endpoints_are_401ish_for_anonymous(client):
    assert client.get("/api/v1/admin/stats").status_code == 401


def test_admin_stats_shape(client, db_session, admin, monkeypatch, mock_ai):
    # admin generates twice (1 live + 1 cache hit) and leaves feedback
    from tests.test_generation import generate as gen

    recipe_id = gen(client, admin)[-1][1]["recipe_id"]
    gen(client, admin)
    client.post(f"/api/v1/recipes/{recipe_id}/feedback", json={"wert": 1}, headers=admin)

    stats = client.get("/api/v1/admin/stats?days=7").json()
    # identical params by the same user regenerate now -> both calls are live
    assert stats["generations"]["total"] == 2
    assert stats["generations"]["live"] == 2
    assert stats["generations"]["cached"] == 0
    assert stats["tokens"]["in"] == 6000
    assert stats["cost_usd"] >= 0
    assert stats["per_user"][0]["email"] == "admin@example.com"
    version = list(stats["feedback"].keys())[0]
    assert stats["feedback"][version]["up"] == 1
    assert stats["limits"]["per_user"] == get_settings().daily_limit_per_user


def test_admin_allowlist_crud(client, admin):
    r = client.post("/api/v1/admin/allowlist", json={"email": "Neu@Example.COM"}, headers=admin)
    assert r.json() == {"email": "neu@example.com"}

    items = client.get("/api/v1/admin/allowlist").json()["items"]
    emails = [i["email"] for i in items]
    assert "neu@example.com" in emails
    assert "admin@example.com" in emails
    admin_entry = next(i for i in items if i["email"] == "admin@example.com")
    assert admin_entry["registered"] is True

    assert client.delete("/api/v1/admin/allowlist/neu@example.com", headers=admin).status_code == 200
    assert "neu@example.com" not in [i["email"] for i in client.get("/api/v1/admin/allowlist").json()["items"]]
    assert client.delete("/api/v1/admin/allowlist/neu@example.com", headers=admin).status_code == 404


def test_admin_allowlist_rejects_invalid_email(client, admin):
    assert client.post("/api/v1/admin/allowlist", json={"email": "kein-email"}, headers=admin).status_code == 422
