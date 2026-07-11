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
        max_zeit_min=30,
        schwierigkeit="einfach",
        personen=4,
        vorhandene_zutaten=["Kokosmilch", "Limetten"],
    )
    prompt = recipe_v2.build_user_prompt(params)
    for expected in ["Thai", "scharf", "frisch", "vegan", "glutenfrei", "30 Minuten", "einfach", "4", "Kokosmilch"]:
        assert expected in prompt
    assert "vegetarisch" not in prompt  # vegan subsumes it


def test_user_prompt_variation_hint_only_on_regenerate():
    base = GenerateParams(modus="kochen")
    assert "ANDERE Variante" not in recipe_v2.build_user_prompt(base)
    assert "ANDERE Variante" in recipe_v2.build_user_prompt(GenerateParams(modus="kochen", regenerate=True))


def test_cocktail_prompt_respects_alcohol_free():
    params = GenerateParams(modus="cocktail", alkoholfrei=True, basis_spirituose="Gin")
    prompt = recipe_v2.build_user_prompt(params)
    assert "Alkoholfrei" in prompt
    assert "Basis-Spirituose" not in prompt  # spirit must be ignored when alcohol-free


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
