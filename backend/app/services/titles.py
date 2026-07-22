"""Recipe-title identity — the basis for duplicate detection.

Two generations count as the same dish when their titles reduce to the same
key. Case, diacritics, punctuation, filler words and word ORDER are ignored,
so „Der klassische Daiquiri" == „Daiquiri" and „Pasta mit Tomaten" ==
„Tomaten-Pasta".

Deliberately conservative: only obvious filler is dropped, so a genuinely
different dish keeps its own key — „Erdbeer-Daiquiri" does NOT collide with
„Daiquiri". Better to let a rare near-duplicate through than to suppress a
recipe the user actually wanted.
"""

import re
import unicodedata

# Words that carry no dish identity of their own.
_FILLER = frozenset(
    {
        # articles / prepositions / conjunctions
        "der", "die", "das", "den", "dem", "des", "ein", "eine", "einer",
        "eines", "einem", "und", "mit", "im", "in", "auf", "aus", "vom",
        "von", "zum", "zur", "nach", "a", "the", "with", "and",
        # marketing adjectives the model likes to prepend
        "klassisch", "klassische", "klassischer", "klassisches", "klassischen",
        "original", "originale", "originaler", "originales",
        "echt", "echte", "echter", "echtes",
        "einfach", "einfache", "einfacher", "einfaches",
        "schnell", "schnelle", "schneller", "schnelles",
        "perfekt", "perfekte", "perfekter", "perfektes",
        "hausgemacht", "hausgemachte", "hausgemachter", "hausgemachtes",
        "traditionell", "traditionelle", "traditioneller", "traditionelles",
        "cremig", "cremige", "cremiger", "cremiges",
        # category nouns — „Daiquiri Cocktail" is still a Daiquiri
        "cocktail", "drink", "rezept", "style", "art", "variante",
    }
)

# ae/oe/ue first (German convention), then strip any remaining diacritics.
_UMLAUTS = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"})


def _fold(text: str) -> str:
    lowered = text.lower().translate(_UMLAUTS)
    decomposed = unicodedata.normalize("NFKD", lowered)
    return "".join(c for c in decomposed if not unicodedata.combining(c))


def title_key(title: str) -> str:
    """Order- and wording-insensitive identity of a recipe title.

    Returns "" for an empty/meaningless title — callers must treat that as
    "no match" rather than as a key, otherwise every untitled draft would
    collide with every other one.
    """
    tokens = [t for t in re.split(r"[^a-z0-9]+", _fold(title)) if t]
    core = sorted({t for t in tokens if t not in _FILLER})
    # A title made of nothing but filler („Der Cocktail") keeps its words,
    # so it can't swallow every other recipe.
    return " ".join(core or sorted(set(tokens)))


def is_duplicate(title: str, known_keys: set[str]) -> bool:
    key = title_key(title)
    return bool(key) and key in known_keys
