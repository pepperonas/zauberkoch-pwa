"""Soft-deleting a recipe: hidden from the user everywhere, but the row (and
its generation_cache entry) survives so re-generation is a free cache hit."""

import pytest

from app.services import ratelimit_ip
from tests.test_auth import add_to_allowlist, do_login_callback, fake_claims
from tests.test_generation import PARAMS, generate, logged_in, mock_ai, parse_sse  # noqa: F401


@pytest.fixture(autouse=True)
def _reset_ip_limits():
    ratelimit_ip.reset()
    yield
    ratelimit_ip.reset()


def _delete(client, recipe_id, headers):
    return client.delete(f"/api/v1/recipes/{recipe_id}", headers=headers)


def test_delete_requires_csrf(client, logged_in, mock_ai):
    rid = generate(client, logged_in)[-1][1]["recipe_id"]
    assert client.delete(f"/api/v1/recipes/{rid}").status_code == 403  # no CSRF header
    # still there
    assert client.get(f"/api/v1/recipes/{rid}").status_code == 200


def test_delete_hides_recipe_everywhere(client, logged_in, mock_ai):
    rid = generate(client, logged_in)[-1][1]["recipe_id"]
    assert rid in [r["id"] for r in client.get("/api/v1/recipes").json()["items"]]

    r = _delete(client, rid, logged_in)
    assert r.status_code == 200 and r.json() == {"deleted": rid}

    # gone from history + detail
    assert rid not in [r["id"] for r in client.get("/api/v1/recipes").json()["items"]]
    assert client.get(f"/api/v1/recipes/{rid}").status_code == 404
    # gone from every owner-scoped mutation
    assert client.put(f"/api/v1/recipes/{rid}/favorite", headers=logged_in).status_code == 404
    assert client.post(f"/api/v1/recipes/{rid}/gekocht", headers=logged_in).status_code == 404
    assert client.post(
        "/api/v1/shopping/from-recipe", json={"recipe_id": rid}, headers=logged_in
    ).status_code == 404
    assert client.post(f"/api/v1/recipes/{rid}/share", headers=logged_in).status_code == 404
    # deleting again is a no-op 404
    assert _delete(client, rid, logged_in).status_code == 404


def test_delete_only_own_recipe(client, db_session, logged_in, mock_ai, monkeypatch):
    from app.models import Recipe

    rid = generate(client, logged_in)[-1][1]["recipe_id"]  # alice's

    add_to_allowlist(db_session, "bob@example.com")
    do_login_callback(client, monkeypatch, claims=fake_claims(email="bob@example.com", sub="sub-bob"))
    bob_csrf = {"X-CSRF-Token": client.get("/api/v1/me").json()["csrf_token"]}
    assert _delete(client, rid, bob_csrf).status_code == 404  # not bob's

    # alice's recipe untouched (client session is bob's now, so check the DB)
    db_session.expire_all()
    assert db_session.get(Recipe, rid).deleted_at is None


def test_deleted_recipe_regenerates_from_cache_free(client, logged_in, mock_ai):
    """The cost win: after delete, asking for the SAME params again serves the
    cached AI output (free, no new call) and resurrects the row — instead of
    the 'already have it -> regenerate' path that would cost a live generation."""
    first = generate(client, logged_in)[-1][1]
    rid = first["recipe_id"]
    assert first["cached"] is False and mock_ai["count"] == 1

    _delete(client, rid, logged_in)

    events = generate(client, logged_in)  # identical params
    saved = events[-1][1]
    assert saved["cached"] is True  # served from cache, NOT a paid variation
    assert mock_ai["count"] == 1  # no second AI call
    assert saved["recipe_id"] == rid  # same row resurrected (no duplicate)
    assert saved["remaining"] == 19  # only the first generation was ever charged

    # recipe is back in the user's history
    assert rid in [r["id"] for r in client.get("/api/v1/recipes").json()["items"]]


def test_deleted_recipe_share_link_stops_resolving(client, logged_in, mock_ai):
    rid = generate(client, logged_in)[-1][1]["recipe_id"]
    token = client.post(f"/api/v1/recipes/{rid}/share", headers=logged_in).json()["share_token"]
    assert client.get(f"/api/v1/share/{token}").status_code == 200

    _delete(client, rid, logged_in)
    assert client.get(f"/api/v1/share/{token}").status_code == 404
