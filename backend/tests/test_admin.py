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


def test_admin_invite_create_list_revoke(client, admin):
    # mint a batch
    created = client.post("/api/v1/admin/invites", json={"count": 3}, headers=admin).json()["created"]
    assert len(created) == 3
    assert all(c.startswith("zk-") and len(c) >= 15 for c in created)
    assert len(set(created)) == 3  # unique

    items = client.get("/api/v1/admin/invites").json()["items"]
    codes = {i["code"] for i in items}
    assert set(created) <= codes
    assert all(i["used"] is False for i in items if i["code"] in created)

    # count is clamped to [1, 50]
    assert len(client.post("/api/v1/admin/invites", json={"count": 999}, headers=admin).json()["created"]) == 50
    assert len(client.post("/api/v1/admin/invites", json={"count": 0}, headers=admin).json()["created"]) == 1

    # revoke an unused code
    victim = created[0]
    assert client.delete(f"/api/v1/admin/invites/{victim}", headers=admin).status_code == 200
    assert victim not in {i["code"] for i in client.get("/api/v1/admin/invites").json()["items"]}
    assert client.delete(f"/api/v1/admin/invites/{victim}", headers=admin).status_code == 404


def test_admin_invite_enables_signup_and_cannot_be_revoked_after_use(client, admin, db_session, monkeypatch):
    code = client.post("/api/v1/admin/invites", json={"count": 1}, headers=admin).json()["created"][0]

    # a non-allowlisted user signs up with the admin-issued code
    r = do_login_callback(client, monkeypatch, claims=fake_claims(email="dora@example.com", sub="sub-dora"), invite=code)
    assert "login_error" not in r.headers["location"]
    assert client.get("/api/v1/me").json()["email"] == "dora@example.com"

    # back to admin (new session -> fresh CSRF token): the code now shows who
    # redeemed it and can't be deleted
    do_login_callback(client, monkeypatch, claims=fake_claims(email="admin@example.com", sub="sub-admin"))
    hdr = {"X-CSRF-Token": client.get("/api/v1/me").json()["csrf_token"]}
    row = next(i for i in client.get("/api/v1/admin/invites").json()["items"] if i["code"] == code)
    assert row["used"] is True and row["used_by"] == "dora@example.com"
    assert client.delete(f"/api/v1/admin/invites/{code}", headers=hdr).status_code == 409


def test_admin_invite_endpoints_are_404_for_normal_users(client, logged_in):
    assert client.get("/api/v1/admin/invites").status_code == 404
    assert client.post("/api/v1/admin/invites", json={"count": 1}, headers=logged_in).status_code == 404
