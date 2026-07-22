"""Prompt v2 + LLM schema: cacheability, stability, parameter mapping."""

from app.prompts import recipe_v1, recipe_v2
from app.schemas.recipe import GenerateParams, recipe_llm_schema


def test_v2_system_prompt_exceeds_cache_minimum():
    # ~2048 tokens minimum cacheable prefix on the Sonnet tier; rough
    # heuristic: >= 3 chars/token for German text. Live-measured: ~6.2k tokens.
    assert len(recipe_v2.SYSTEM_PROMPT) > 2048 * 3


def test_v2_system_prompt_is_deterministic():
    # cache prefix must be byte-stable — no timestamps/randomness at import time
    import importlib

    before = recipe_v2.SYSTEM_PROMPT
    importlib.reload(recipe_v2)
    assert recipe_v2.SYSTEM_PROMPT == before


def test_v2_contains_both_few_shot_examples():
    assert "Saltimbocca" in recipe_v2.SYSTEM_PROMPT
    assert "Penicillin" in recipe_v2.SYSTEM_PROMPT
    assert recipe_v2.SYSTEM_PROMPT.startswith(recipe_v1.SYSTEM_PROMPT)


def test_user_prompt_maps_all_constraints():
    params = GenerateParams(
        modus="kochen",
        kueche="Thai",
        geschmack=["scharf", "frisch"],
        vegan=True,
        glutenfrei=True,
        proteinreich=True,
        ketogen=True,
        max_zeit_min=30,
        schwierigkeit="einfach",
        personen=4,
        vorhandene_zutaten=["Kokosmilch", "Limetten"],
    )
    prompt = recipe_v2.build_user_prompt(params)
    for expected in [
        "Thai", "scharf", "frisch", "vegan", "glutenfrei", "30 Minuten", "einfach", "4", "Kokosmilch",
        "High-Protein", "40 g Eiweiß", "ketogen", "20 g Kohlenhydrate",
    ]:
        assert expected in prompt
    assert "vegetarisch" not in prompt  # vegan subsumes it


def test_user_prompt_variation_hint_only_on_regenerate():
    base = GenerateParams(modus="kochen")
    assert "ANDERE Variante" not in recipe_v2.build_user_prompt(base)
    assert "ANDERE Variante" in recipe_v2.build_user_prompt(GenerateParams(modus="kochen", regenerate=True))


def test_v5_avoid_list_attached_on_every_generation():
    from app.prompts import recipe_v3, recipe_v5
    from app.services import ai

    assert ai.prompt_version() == recipe_v5.PROMPT_VERSION == "v5"
    # system block unchanged vs v3 -> Anthropic prompt cache keeps hitting
    assert recipe_v5.SYSTEM_PROMPT == recipe_v3.SYSTEM_PROMPT

    # the avoid list renders even WITHOUT regenerate (the v4->v5 fix): a
    # near-duplicate param set must be steered away from earlier dishes too
    prompt = recipe_v5.build_user_prompt(
        GenerateParams(modus="cocktail", vermeiden_titel=["Daiquiri", "Mojito"])
    )
    assert "SCHON" in prompt
    assert "„Daiquiri“" in prompt and "„Mojito“" in prompt

    # absent when the list is empty
    assert "SCHON" not in recipe_v5.build_user_prompt(GenerateParams(modus="kochen"))

    # capped so the prompt can't balloon (belt-and-suspenders: the schema caps
    # at 40 too). model_construct bypasses validation to exercise the slice.
    long = GenerateParams.model_construct(modus="kochen", vermeiden_titel=[f"Rezept {i}" for i in range(80)])
    rendered = recipe_v5.build_user_prompt(long)
    assert "„Rezept 0“" in rendered
    assert "„Rezept 79“" not in rendered  # beyond MAX_AVOID_TITLES


def test_vermeiden_titel_and_personen_do_not_change_cache_key():
    from app.services.cache import params_hash

    a = GenerateParams(modus="kochen", kueche="Italienisch", personen=2)
    b = GenerateParams(modus="kochen", kueche="Italienisch", personen=4, vermeiden_titel=["X"], regenerate=True)
    assert params_hash(a) == params_hash(b)


def test_cocktail_prompt_respects_alcohol_free():
    params = GenerateParams(modus="cocktail", alkoholfrei=True, basis_spirituose="Gin")
    prompt = recipe_v2.build_user_prompt(params)
    assert "Alkoholfrei" in prompt
    assert "Basis-Spirituose" not in prompt  # spirit must be ignored when alcohol-free


def test_cocktail_prompt_maps_drink_typ():
    params = GenerateParams(modus="cocktail", drink_typ="Longdrink", basis_spirituose="Rum")
    prompt = recipe_v2.build_user_prompt(params)
    assert "Drink-Typ: „Longdrink“" in prompt
    # drink_typ changes the cache key, kochen ignores it in the prompt
    from app.services.cache import params_hash

    assert params_hash(params) != params_hash(GenerateParams(modus="cocktail", drink_typ="Shot", basis_spirituose="Rum"))
    assert "Drink-Typ" not in recipe_v2.build_user_prompt(GenerateParams(modus="kochen", drink_typ="Shot"))


def test_kochen_prompt_maps_gericht_typ():
    from app.services.cache import params_hash

    params = GenerateParams(modus="kochen", kueche="Deutsch", gericht_typ="Dessert")
    prompt = recipe_v2.build_user_prompt(params)
    assert "Gericht-Art: „Dessert“" in prompt
    # gericht_typ changes the cache key
    assert params_hash(params) != params_hash(GenerateParams(modus="kochen", kueche="Deutsch", gericht_typ="Snack"))
    # only rendered for kochen (cocktails use drink_typ instead)
    assert "Gericht-Art" not in recipe_v2.build_user_prompt(
        GenerateParams(modus="cocktail", drink_typ="Shot", gericht_typ="Dessert")
    )


def _assert_hardened(node: dict) -> None:
    if node.get("type") == "object" and "properties" in node:
        assert node.get("additionalProperties") is False
        assert set(node.get("required", [])) == set(node["properties"].keys())
    for child in node.get("properties", {}).values():
        _assert_hardened(child)
    for child in node.get("$defs", {}).values():
        _assert_hardened(child)
    if isinstance(node.get("items"), dict):
        _assert_hardened(node["items"])
    for variant in node.get("anyOf", []):
        _assert_hardened(variant)


def test_llm_schema_is_fully_hardened():
    schema = recipe_llm_schema()
    _assert_hardened(schema)
    assert "titel" in schema["properties"]
    assert "zutaten" in schema["required"]
    # empty ingredient/step lists must be schema-impossible (seen once in
    # prod); the API supports only minItems 0|1 — larger values are a 400
    assert schema["properties"]["zutaten"]["minItems"] == 1
    assert schema["properties"]["schritte"]["minItems"] == 1
