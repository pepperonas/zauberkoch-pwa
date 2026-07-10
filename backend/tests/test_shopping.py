"""Aggregation service + shopping/favorites endpoints."""

import pytest

from app.services import ratelimit_ip
from app.services.aggregation import format_amount, normalize
from tests.test_generation import PARAMS, generate, logged_in, mock_ai  # noqa: F401 (fixtures)


@pytest.fixture(autouse=True)
def _reset_ip_limits():
    ratelimit_ip.reset()
    yield
    ratelimit_ip.reset()


# --- aggregation unit tests -------------------------------------------------

def test_normalize_converts_to_base_units():
    assert normalize("Mehl", 1.5, "kg").menge == 1500
    assert normalize("Mehl", 1.5, "kg").einheit == "g"
    assert normalize("Rum", 4, "cl").menge == 40
    assert normalize("Rum", 4, "cl").einheit == "ml"
    assert normalize("Milch", 1, "l").menge == 1000


def test_normalize_handles_free_text_amounts():
    n = normalize("Salz", "nach Geschmack", "")
    assert n.menge is None
    assert n.einheit == ""


def test_normalize_unknown_unit_kept_verbatim():
    n = normalize("Basilikum", 2, "Töpfe")
    assert n.einheit == "Töpfe"
    assert n.menge == 2


def test_format_amount_upscales():
    assert format_amount(1500, "g") == (1.5, "kg")
    assert format_amount(2000, "ml") == (2.0, "l")
    assert format_amount(250, "g") == (250, "g")


# --- endpoints ---------------------------------------------------------------

def _generate_recipe(client, headers):
    events = generate(client, headers)
    return events[-1][1]["recipe_id"]


def test_favorite_toggle_and_filter(client, logged_in, mock_ai):  # noqa: F811
    recipe_id = _generate_recipe(client, logged_in)

    r = client.put(f"/api/v1/recipes/{recipe_id}/favorite", headers=logged_in)
    assert r.json()["is_favorite"] is True
    assert client.get("/api/v1/recipes?favorites_only=true").json()["items"][0]["id"] == recipe_id

    r = client.delete(f"/api/v1/recipes/{recipe_id}/favorite", headers=logged_in)
    assert r.json()["is_favorite"] is False
    assert client.get("/api/v1/recipes?favorites_only=true").json()["items"] == []


def test_shopping_from_recipe_aggregates_duplicates(client, logged_in, mock_ai):  # noqa: F811
    recipe_id = _generate_recipe(client, logged_in)

    r = client.post("/api/v1/shopping/from-recipe", json={"recipe_id": recipe_id}, headers=logged_in)
    items = {i["name"]: i for i in r.json()["items"]}
    assert items["Spaghetti"]["menge"] == 250

    # adding the same recipe again doubles the amounts instead of duplicating rows
    r = client.post("/api/v1/shopping/from-recipe", json={"recipe_id": recipe_id}, headers=logged_in)
    rows = r.json()["items"]
    spaghetti = [i for i in rows if i["name"] == "Spaghetti"]
    assert len(spaghetti) == 1
    assert spaghetti[0]["menge"] == 500


def test_shopping_from_recipe_scales_portions(client, logged_in, mock_ai):  # noqa: F811
    recipe_id = _generate_recipe(client, logged_in)  # recipe has 2 portions, 250 g spaghetti
    r = client.post(
        "/api/v1/shopping/from-recipe", json={"recipe_id": recipe_id, "portionen": 4}, headers=logged_in
    )
    items = {i["name"]: i for i in r.json()["items"]}
    assert items["Spaghetti"]["menge"] == 500


def test_shopping_check_reorder_and_clear(client, logged_in, mock_ai):  # noqa: F811
    a = client.post("/api/v1/shopping/items", json={"name": "Zitronen", "menge": 3, "einheit": "Stück"}, headers=logged_in).json()
    b = client.post("/api/v1/shopping/items", json={"name": "Olivenöl"}, headers=logged_in).json()

    r = client.post("/api/v1/shopping/reorder", json={"ids": [b["id"], a["id"]]}, headers=logged_in)
    assert [i["id"] for i in r.json()["items"]] == [b["id"], a["id"]]

    client.patch(f"/api/v1/shopping/items/{a['id']}", json={"checked": True}, headers=logged_in)
    r = client.delete("/api/v1/shopping/checked", headers=logged_in)
    remaining = r.json()["items"]
    assert [i["id"] for i in remaining] == [b["id"]]


def test_shopping_requires_csrf(client, logged_in, mock_ai):  # noqa: F811
    r = client.post("/api/v1/shopping/items", json={"name": "X"})
    assert r.status_code == 403
