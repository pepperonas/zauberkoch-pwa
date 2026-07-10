"""Shopping-list aggregation: normalize units, merge equal ingredients."""

from dataclasses import dataclass

# unit (lowercased) -> (base unit, factor to base)
UNIT_MAP: dict[str, tuple[str, float]] = {
    "g": ("g", 1), "gramm": ("g", 1), "kg": ("g", 1000),
    "ml": ("ml", 1), "l": ("ml", 1000), "liter": ("ml", 1000), "cl": ("ml", 10),
    "el": ("EL", 1), "tl": ("TL", 1),
    "stück": ("Stück", 1), "stk": ("Stück", 1), "stueck": ("Stück", 1),
    "prise": ("Prise", 1), "prisen": ("Prise", 1),
    "bund": ("Bund", 1), "zehe": ("Zehe", 1), "zehen": ("Zehe", 1),
    "dose": ("Dose", 1), "dosen": ("Dose", 1),
    "packung": ("Packung", 1), "päckchen": ("Päckchen", 1),
    "zweig": ("Zweig", 1), "zweige": ("Zweig", 1), "blatt": ("Blatt", 1), "blätter": ("Blatt", 1),
}


@dataclass
class NormalizedIngredient:
    name_key: str  # merge key (lowercased, trimmed)
    name: str  # display name
    menge: float | None  # in base unit; None for "nach Geschmack" etc.
    einheit: str  # base unit ("" when menge is None)


def normalize(name: str, menge: float | str | None, einheit: str) -> NormalizedIngredient:
    display = name.strip()
    key = display.lower()
    if not isinstance(menge, (int, float)):
        return NormalizedIngredient(key, display, None, "")
    unit_key = einheit.strip().lower()
    base, factor = UNIT_MAP.get(unit_key, (einheit.strip(), 1))
    return NormalizedIngredient(key, display, float(menge) * factor, base)


def format_amount(menge: float, einheit: str) -> tuple[float, str]:
    """Render base units back to a friendly display unit."""
    if einheit == "g" and menge >= 1000:
        return round(menge / 1000, 2), "kg"
    if einheit == "ml" and menge >= 1000:
        return round(menge / 1000, 2), "l"
    return round(menge, 2), einheit


def scale(menge: float | str | None, factor: float) -> float | str | None:
    if isinstance(menge, (int, float)):
        return float(menge) * factor
    return menge


def merge_key(item: NormalizedIngredient) -> tuple[str, str]:
    return (item.name_key, item.einheit)
