"""Title identity + duplicate detection (services/titles.py) — pure, no DB."""

from app.services.titles import is_duplicate, title_key


def test_wording_and_order_collapse_to_one_key():
    # the exact case from the bug report: same dish, "classic" prefix / re-worded
    a = title_key("Daiquiri")
    b = title_key("Der klassische Daiquiri")
    c = title_key("Daiquiri, klassisch")
    assert a == b == c

    # word order / hyphenation / composition
    assert title_key("Pasta mit Tomaten") == title_key("Tomaten-Pasta")
    assert title_key("Spaghetti Aglio e Olio") == title_key("Aglio e Olio Spaghetti")


def test_case_diacritics_and_category_nouns_ignored():
    # ü->ue + strip is applied CONSISTENTLY (model output is consistent), so a
    # reworded model title matches; case is irrelevant.
    assert title_key("KÄSESPÄTZLE") == title_key("Käsespätzle")
    assert title_key("Püree Klassisch") == title_key("püree")
    assert title_key("Mojito Cocktail") == title_key("Mojito")
    assert title_key("Negroni Drink") == title_key("negroni")


def test_genuinely_different_dishes_keep_distinct_keys():
    # a real modifier must NOT collapse into the base dish
    assert title_key("Erdbeer-Daiquiri") != title_key("Daiquiri")
    assert title_key("Hugo Spritz") != title_key("Aperol Spritz")
    assert title_key("Vegane Bolognese") != title_key("Bolognese")  # 'vegan' isn't filler
    assert title_key("Grüne Gazpacho") != title_key("Gazpacho")


def test_empty_and_filler_only_titles():
    assert title_key("") == ""
    assert title_key("   —  ") == ""
    # a title that is ONLY filler keeps its words instead of becoming ""
    assert title_key("Der Cocktail") != ""
    assert title_key("Der Cocktail") == title_key("Cocktail der")


def test_is_duplicate_semantics():
    known = {title_key("Daiquiri"), title_key("Mojito")}
    assert is_duplicate("Der klassische Daiquiri", known)
    assert is_duplicate("MOJITO Cocktail", known)
    assert not is_duplicate("Erdbeer-Daiquiri", known)
    assert not is_duplicate("Negroni", known)
    # an empty title is never a duplicate (no key -> no match)
    assert not is_duplicate("", known)
    assert not is_duplicate("  ", known | {""})
