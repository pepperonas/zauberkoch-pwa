"""Recipe JSON schema and generation parameters (Pydantic v2)."""

from typing import Literal

from pydantic import BaseModel, Field


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
    # Meta
    ueberrasch_mich: bool = False
    regenerate: bool = False  # bypass cache, ask for a variation

    def cache_relevant(self) -> dict:
        """Normalized params for the cache key (regenerate excluded)."""
        data = self.model_dump(exclude={"regenerate"})
        data["geschmack"] = sorted(g.strip().lower() for g in data["geschmack"] if g.strip())
        data["vorhandene_zutaten"] = sorted(z.strip().lower() for z in data["vorhandene_zutaten"] if z.strip())
        data["kueche"] = data["kueche"].strip().lower()
        data["kueche_freitext"] = data["kueche_freitext"].strip().lower()
        data["basis_spirituose"] = data["basis_spirituose"].strip().lower()
        data["glas_vorgabe"] = data["glas_vorgabe"].strip().lower()
        return data
