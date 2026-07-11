"""Share links, adopt, OG image, and shopping clear/replace (undo base)."""

import pytest

from app.services import ratelimit_ip
from tests.test_auth import add_to_allowlist, do_login_callback, fake_claims
from tests.test_generation import PARAMS, generate, logged_in, mock_ai  # noqa: F401 (fixtures)


@pytest.fixture(autouse=True)
def _reset_ip_limits():
    ratelimit_ip.reset()
    yield
    ratelimit_ip.reset()


def _shared_recipe(client, headers):
    recipe_id = generate(client, headers)[-1][1]["recipe_id"]
    r = client.post(f"/api/v1/recipes/{recipe_id}/share", headers=headers)
    assert r.status_code == 200
    return recipe_id, r.json()


# ---- share links ------------------------------------------------------------

def test_share_create_is_idempotent(client, logged_in, mock_ai):  # noqa: F811
    recipe_id, first = _shared_recipe(client, logged_in)
    second = client.post(f"/api/v1/recipes/{recipe_id}/share", headers=logged_in).json()
    assert first["share_token"] == second["share_token"]
    assert first["share_url"].endswith(f"/r/{first['share_token']}")


def test_public_share_needs_no_auth(client, logged_in, mock_ai):  # noqa: F811
    _, share = _shared_recipe(client, logged_in)
    fresh = client  # same client but endpoint requires no session/CSRF
    r = fresh.get(f"/api/v1/share/{share['share_token']}")
    assert r.status_code == 200
    body = r.json()
    assert body["recipe"]["titel"] == "Pasta al Limone"
    assert body["mode"] == "kochen"


def test_revoke_kills_link(client, logged_in, mock_ai):  # noqa: F811
    recipe_id, share = _shared_recipe(client, logged_in)
    client.delete(f"/api/v1/recipes/{recipe_id}/share", headers=logged_in)
    assert client.get(f"/api/v1/share/{share['share_token']}").status_code == 404


def test_unknown_token_404(client):
    assert client.get("/api/v1/share/doesnotexist1").status_code == 404


def test_adopt_copies_recipe(client, db_session, logged_in, mock_ai, monkeypatch):  # noqa: F811
    _, share = _shared_recipe(client, logged_in)

    # second user logs in and adopts
    add_to_allowlist(db_session, "bob@example.com")
    do_login_callback(client, monkeypatch, claims=fake_claims(email="bob@example.com", sub="sub-bob"))
    csrf = client.get("/api/v1/me").json()["csrf_token"]

    r = client.post(f"/api/v1/share/{share['share_token']}/adopt", headers={"X-CSRF-Token": csrf})
    assert r.status_code == 200
    new_id = r.json()["recipe_id"]

    detail = client.get(f"/api/v1/recipes/{new_id}").json()
    assert detail["recipe"]["titel"] == "Pasta al Limone"


def test_og_png_renders(client, logged_in, mock_ai):  # noqa: F811
    _, share = _shared_recipe(client, logged_in)
    r = client.get(f"/api/v1/share/{share['share_token']}/og.png")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/png"
    assert r.content[:8] == b"\x89PNG\r\n\x1a\n"

    from PIL import Image
    from io import BytesIO

    img = Image.open(BytesIO(r.content))
    assert img.size == (1200, 630)


def test_share_html_page_has_og_meta(client, logged_in, mock_ai):  # noqa: F811
    _, share = _shared_recipe(client, logged_in)
    r = client.get(f"/r/{share['share_token']}")
    assert r.status_code == 200
    assert 'og:title' in r.text
    assert 'Pasta al Limone' in r.text
    assert f"/api/v1/share/{share['share_token']}/og.png" in r.text
    assert 'rel="canonical"' in r.text
    assert 'og:image:alt' in r.text


def test_share_page_replaces_root_meta_and_title(client, logged_in, mock_ai, monkeypatch, tmp_path):  # noqa: F811
    """The static root OG block must be stripped and <title> replaced — otherwise
    crawlers read the root tags (first in <head>) instead of the recipe's."""
    from app.api.v1 import share as share_module

    shell = tmp_path / "index.html"
    shell.write_text(
        "<!doctype html><html><head>"
        "<title>Zauberkoch — KI-Rezepte &amp; Cocktails</title>"
        "<!-- zk:root-meta:start — stripped & replaced by share.py on /r/{token} pages -->"
        '<meta property="og:title" content="ROOT-OG-TITLE">'
        '<link rel="canonical" href="https://zauberkoch.de/">'
        "<!-- zk:root-meta:end -->"
        "</head><body></body></html>",
        encoding="utf-8",
    )
    monkeypatch.setattr(share_module, "WEBROOT_INDEX", shell)

    _, share = _shared_recipe(client, logged_in)
    r = client.get(f"/r/{share['share_token']}")
    assert r.status_code == 200
    assert "ROOT-OG-TITLE" not in r.text
    assert 'href="https://zauberkoch.de/"' not in r.text  # root canonical gone
    assert "<title>Pasta al Limone — Zauberkoch</title>" in r.text
    assert r.text.count("og:title") == 1  # exactly the recipe's


# ---- shopping clear-all + replace (undo base) --------------------------------

def test_shopping_clear_all_and_replace_restores(client, logged_in, mock_ai):  # noqa: F811
    client.post("/api/v1/shopping/items", json={"name": "Zitronen", "menge": 3, "einheit": "Stück"}, headers=logged_in)
    client.post("/api/v1/shopping/items", json={"name": "Olivenöl"}, headers=logged_in)

    snapshot = client.get("/api/v1/shopping").json()["items"]
    assert len(snapshot) == 2

    r = client.delete("/api/v1/shopping", headers=logged_in)
    assert r.json()["items"] == []

    restore = [{"name": i["name"], "menge": i["menge"], "einheit": i["einheit"], "checked": i["checked"]} for i in snapshot]
    r = client.post("/api/v1/shopping/replace", json={"items": restore}, headers=logged_in)
    names = [i["name"] for i in r.json()["items"]]
    assert names == ["Zitronen", "Olivenöl"]
