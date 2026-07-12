"""Recipe JSON schema and generation parameters (Pydantic v2)."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class Zutat(BaseModel):
    menge: float | str | None = None  # numeric where possible; "nach Geschmack" etc. as string
    einheit: str = ""
    name: str
    gruppe: str = ""  # e.g. "Für die Sauce"


class Schritt(BaseModel):
    nr: int
    titel: str
    text: str
    dauer_sek: int | None = None  # set only when the step has a meaningful timer


class Naehrwerte(BaseModel):
    kalorien_kcal: int | None = None
    eiweiss_g: float | None = None
    fett_g: float | None = None
    kohlenhydrate_g: float | None = None


class Recipe(BaseModel):
    titel: str
    teaser: str
    kueche: str
    tags: list[str] = []
    portionen: int
    zeit_aktiv: int  # minutes
    zeit_gesamt: int  # minutes
    schwierigkeit: Literal["einfach", "mittel", "anspruchsvoll"]
    zutaten: list[Zutat]
    schritte: list[Schritt]
    tipps: list[str] = []
    naehrwerte: Naehrwerte | None = None
    glas: str | None = None  # cocktail only
    garnitur: str | None = None  # cocktail only


def recipe_llm_schema() -> dict:
    """JSON schema for structured outputs: additionalProperties=false and
    all keys required on every object (the model must emit every field)."""

    def harden(node: dict) -> None:
        if node.get("type") == "object" and "properties" in node:
            node["additionalProperties"] = False
            node["required"] = list(node["properties"].keys())
        for child in node.get("properties", {}).values():
            harden(child)
        for child in node.get("$defs", {}).values():
            harden(child)
        if "items" in node and isinstance(node["items"], dict):
            harden(node["items"])
        for variant in node.get("anyOf", []):
            harden(variant)

    schema = Recipe.model_json_schema()
    harden(schema)
    # A recipe without ingredients or steps is worthless — observed once in
    # prod (empty schritte). Structured outputs only support minItems 0|1,
    # which is exactly enough to make empty arrays schema-impossible.
    schema["properties"]["zutaten"]["minItems"] = 1
    schema["properties"]["schritte"]["minItems"] = 1
    return schema


GESCHMACK = ["scharf", "umami", "süß", "sauer", "rauchig", "frisch", "herzhaft", "cremig"]


class GenerateParams(BaseModel):
    """Wizard input. All fields optional except modus — every step is skippable."""

    modus: Literal["kochen", "cocktail"]
    kueche: str = Field(default="", max_length=64)
    kueche_freitext: str = Field(default="", max_length=120)
    geschmack: list[str] = Field(default=[], max_length=8)
    # Constraints
    vegetarisch: bool = False
    vegan: bool = False
    glutenfrei: bool = False
    laktosefrei: bool = False
    max_zeit_min: int | None = Field(default=None, ge=5, le=600)
    schwierigkeit: Literal["einfach", "mittel", "anspruchsvoll"] | None = None
    personen: int = Field(default=2, ge=1, le=12)
    vorhandene_zutaten: list[str] = Field(default=[], max_length=30)
    # Cocktail-specific
    basis_spirituose: str = Field(default="", max_length=64)
    alkoholfrei: bool = False
    glas_vorgabe: str = Field(default="", max_length=64)
    vermeiden: list[str] = Field(default=[], max_length=20)  # no-go ingredients (profile + request)
    # Meta
    ueberrasch_mich: bool = False
    regenerate: bool = False  # bypass cache, ask for a variation
    # Titles the user already received for these params — SERVER-injected on
    # variations (client-sent values are discarded); steers re-rolls away
    # from near-duplicates.
    vermeiden_titel: list[str] = Field(default=[], max_length=10)

    def cache_relevant(self) -> dict:
        """Normalized params for the cache key. Excluded: regenerate +
        vermeiden_titel (meta) and personen (pure scaling, never a new dish)."""
        data = self.model_dump(exclude={"regenerate", "vermeiden_titel", "personen"})
        data["geschmack"] = sorted(g.strip().lower() for g in data["geschmack"] if g.strip())
        data["vorhandene_zutaten"] = sorted(z.strip().lower() for z in data["vorhandene_zutaten"] if z.strip())
        data["vermeiden"] = sorted(v.strip().lower() for v in data["vermeiden"] if v.strip())
        data["kueche"] = data["kueche"].strip().lower()
        data["kueche_freitext"] = data["kueche_freitext"].strip().lower()
        data["basis_spirituose"] = data["basis_spirituose"].strip().lower()
        data["glas_vorgabe"] = data["glas_vorgabe"].strip().lower()
        return data


class Preferences(BaseModel):
    """Persistent per-user defaults, merged into every generation."""

    vegetarisch: bool = False
    vegan: bool = False
    glutenfrei: bool = False
    laktosefrei: bool = False
    vermeiden: list[str] = Field(default=[], max_length=20)
    standard_personen: int = Field(default=2, ge=1, le=12)
    # Personalized cuisine chips for the wizard (empty = app defaults). UI-only:
    # the chosen cuisine still travels as a normal generation param.
    kuechen: list[str] = Field(default=[], max_length=40)

    @field_validator("kuechen")
    @classmethod
    def _clean_kuechen(cls, value: list[str]) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for item in value:
            name = " ".join(item.split())[:40].strip()
            if name and name.lower() not in seen:
                seen.add(name.lower())
                out.append(name)
        return out
