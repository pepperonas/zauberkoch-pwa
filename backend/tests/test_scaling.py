"""Recipe portion scaling — the path that serves a cached recipe for a
different `personen` count (personen is excluded from the cache key exactly
so this can happen for free). Pure functions, no DB."""

from app.api.v1.recipes import _scale_recipe
from app.services.aggregation import scale


def _recipe(portionen, zutaten):
    return {"titel": "Test", "portionen": portionen, "zutaten": zutaten}


def test_scale_doubles_numeric_amounts():
    r = _scale_recipe(_recipe(2, [{"name": "Rum", "menge": 6, "einheit": "cl"}]), 4)
    assert r["portionen"] == 4
    assert r["zutaten"][0]["menge"] == 12
    assert r["zutaten"][0]["einheit"] == "cl"  # unit + name untouched


def test_scale_halves_and_keeps_clean_numbers():
    r = _scale_recipe(_recipe(4, [{"name": "Mehl", "menge": 500, "einheit": "g"}]), 2)
    assert r["zutaten"][0]["menge"] == 250
    # a whole result is an int, not 250.0
    assert isinstance(r["zutaten"][0]["menge"], int)


def test_scale_rounds_fractions_to_two_places():
    # 1 egg for 2 people -> 3 people = 1.5
    r = _scale_recipe(_recipe(2, [{"name": "Ei", "menge": 1, "einheit": "Stück"}]), 3)
    assert r["zutaten"][0]["menge"] == 1.5
    # 100g for 3 -> 4 = 133.33 (round to 2)
    r2 = _scale_recipe(_recipe(3, [{"name": "Reis", "menge": 100, "einheit": "g"}]), 4)
    assert r2["zutaten"][0]["menge"] == 133.33


def test_scale_is_identity_when_portions_match_or_missing():
    same = _recipe(2, [{"name": "Rum", "menge": 6, "einheit": "cl"}])
    assert _scale_recipe(same, 2) is same  # base == personen -> untouched object
    assert _scale_recipe(same, 0) is same  # no target -> untouched
    assert _scale_recipe(_recipe(0, []), 4) == _recipe(0, [])  # no base -> untouched


def test_scale_passes_through_non_numeric_amounts():
    r = _scale_recipe(
        _recipe(2, [
            {"name": "Salz", "menge": "nach Geschmack", "einheit": ""},
            {"name": "Minze", "menge": None, "einheit": "Zweige"},
        ]),
        4,
    )
    assert r["zutaten"][0]["menge"] == "nach Geschmack"
    assert r["zutaten"][1]["menge"] is None


def test_scale_does_not_mutate_the_input():
    src = _recipe(2, [{"name": "Rum", "menge": 6, "einheit": "cl"}])
    _scale_recipe(src, 4)
    assert src["portionen"] == 2 and src["zutaten"][0]["menge"] == 6


def test_aggregation_scale_primitive():
    assert scale(6, 2) == 12.0
    assert scale(2.5, 2) == 5.0
    assert scale("etwas", 3) == "etwas"  # free-text amounts pass through
    assert scale(None, 3) is None
