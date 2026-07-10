"""Recipe system prompt, version 2.

Changes vs v1:
- Two gold few-shot examples (kochen + cocktail) appended to the system
  prompt. This raises format fidelity AND pushes the prompt above the
  ~2048-token minimum cacheable prefix, enabling prompt caching.
- The system prompt must stay byte-stable across requests (cache prefix!) —
  anything volatile (season, user wishes) belongs in the user prompt.

Released versions are never edited in place; iterate as recipe_v3.py.
"""

from app.prompts.recipe_v1 import SYSTEM_PROMPT as _V1_CORE
from app.prompts.recipe_v1 import VARIATION_HINT, build_user_prompt as _build_user_prompt_v1
from app.schemas.recipe import GenerateParams

PROMPT_VERSION = "v2"

_EXAMPLE_KOCHEN = """{
  "titel": "Saltimbocca alla Romana",
  "teaser": "Der römische Klassiker: zartes Kalbsschnitzel, Salbei und Parmaschinken, in Butter und Weißwein glasiert — in 25 Minuten auf dem Teller.",
  "kueche": "Italienisch",
  "tags": ["klassiker", "schnell", "fleisch", "pfanne"],
  "portionen": 2,
  "zeit_aktiv": 20,
  "zeit_gesamt": 25,
  "schwierigkeit": "mittel",
  "zutaten": [
    {"menge": 4, "einheit": "Stück", "name": "kleine Kalbsschnitzel (à ca. 80 g)", "gruppe": ""},
    {"menge": 4, "einheit": "Scheiben", "name": "Parmaschinken", "gruppe": ""},
    {"menge": 8, "einheit": "Blätter", "name": "frischer Salbei", "gruppe": ""},
    {"menge": 2, "einheit": "EL", "name": "Mehl", "gruppe": ""},
    {"menge": 40, "einheit": "g", "name": "kalte Butter", "gruppe": ""},
    {"menge": 100, "einheit": "ml", "name": "trockener Weißwein", "gruppe": ""},
    {"menge": null, "einheit": "", "name": "schwarzer Pfeffer, frisch gemahlen", "gruppe": ""}
  ],
  "schritte": [
    {"nr": 1, "titel": "Vorbereiten", "text": "Schnitzel zwischen Frischhaltefolie auf etwa 5 mm Dicke klopfen. Auf jedes Schnitzel 2 Salbeiblätter legen, mit einer Scheibe Parmaschinken bedecken und mit einem Zahnstocher feststecken.", "dauer_sek": null},
    {"nr": 2, "titel": "Mehlieren", "text": "Nur die Fleischseite hauchdünn in Mehl wenden, überschüssiges Mehl abklopfen. Die Schinkenseite bleibt unbemehlt, damit sie knusprig wird.", "dauer_sek": null},
    {"nr": 3, "titel": "Braten", "text": "Die Hälfte der Butter in einer großen Pfanne aufschäumen. Saltimbocca zuerst auf der Schinkenseite 2 Minuten kräftig braten, wenden und 1 Minute fertig braten. Herausnehmen und warm stellen.", "dauer_sek": 180},
    {"nr": 4, "titel": "Sauce ziehen", "text": "Weißwein in die heiße Pfanne gießen und den Bratensatz mit einem Holzlöffel lösen. Auf ein Drittel einkochen lassen.", "dauer_sek": 120},
    {"nr": 5, "titel": "Montieren und anrichten", "text": "Pfanne vom Herd ziehen, restliche kalte Butter in Stücken einschwenken, bis die Sauce glänzt. Saltimbocca zurücklegen, einmal wenden, pfeffern und sofort servieren.", "dauer_sek": null}
  ],
  "tipps": [
    "Salz ist meist unnötig — der Parmaschinken bringt genug Würze mit. Erst am Ende abschmecken.",
    "Die Butter zum Montieren muss kalt sein, sonst trennt sich die Sauce statt zu binden.",
    "Nicht zu viele Schnitzel gleichzeitig braten — sinkt die Pfannentemperatur, zieht das Fleisch Wasser."
  ],
  "naehrwerte": {"kalorien_kcal": 420, "eiweiss_g": 38.0, "fett_g": 24.0, "kohlenhydrate_g": 8.0},
  "glas": null,
  "garnitur": null
}"""

_EXAMPLE_COCKTAIL = """{
  "titel": "Penicillin",
  "teaser": "Der moderne Klassiker aus New York: Scotch, Honig, Ingwer und ein rauchiger Islay-Float — würzig, wärmend, perfekt ausbalanciert.",
  "kueche": "Modern Classic",
  "tags": ["whisky", "shaken", "würzig", "zitrus"],
  "portionen": 1,
  "zeit_aktiv": 8,
  "zeit_gesamt": 8,
  "schwierigkeit": "mittel",
  "zutaten": [
    {"menge": 5, "einheit": "cl", "name": "Blended Scotch", "gruppe": "Drink"},
    {"menge": 2.5, "einheit": "cl", "name": "frischer Zitronensaft", "gruppe": "Drink"},
    {"menge": 2, "einheit": "cl", "name": "Honig-Ingwer-Sirup", "gruppe": "Drink"},
    {"menge": 0.5, "einheit": "cl", "name": "rauchiger Islay Single Malt (z. B. Laphroaig)", "gruppe": "Float"},
    {"menge": 60, "einheit": "g", "name": "Honig", "gruppe": "Honig-Ingwer-Sirup"},
    {"menge": 30, "einheit": "ml", "name": "Wasser", "gruppe": "Honig-Ingwer-Sirup"},
    {"menge": 20, "einheit": "g", "name": "frischer Ingwer, in dünnen Scheiben", "gruppe": "Honig-Ingwer-Sirup"}
  ],
  "schritte": [
    {"nr": 1, "titel": "Sirup kochen", "text": "Honig, Wasser und Ingwerscheiben aufkochen, 5 Minuten leise köcheln, dann abgedeckt 15 Minuten ziehen lassen und abseihen. Vollständig abkühlen lassen.", "dauer_sek": 1200},
    {"nr": 2, "titel": "Shaken", "text": "Scotch, Zitronensaft und 2 cl Sirup mit reichlich Eis 12–15 Sekunden hart shaken, bis der Shaker beschlägt.", "dauer_sek": null},
    {"nr": 3, "titel": "Abseihen", "text": "Doppelt abseihen (Strainer plus feines Sieb) in einen Tumbler auf einen großen Eiswürfel.", "dauer_sek": null},
    {"nr": 4, "titel": "Float setzen", "text": "Den rauchigen Islay über einen Barlöffelrücken vorsichtig auf die Oberfläche gießen — er soll oben schwimmen, nicht mischen.", "dauer_sek": null}
  ],
  "tipps": [
    "Der Sirup hält im Kühlschrank 2 Wochen und reicht für ca. 4 Drinks — lohnt sich also auf Vorrat.",
    "Ein großer Eiswürfel schmilzt langsamer und verwässert den Drink nicht — notfalls mehrere kleine Würfel in einer Silikonform selbst frieren.",
    "Erst am Glas riechen, dann trinken: Der Rauch-Float ist Aroma-Theater und gehört zur Wirkung."
  ],
  "naehrwerte": null,
  "glas": "Tumbler",
  "garnitur": "Kandierter Ingwer am Spieß"
}"""

SYSTEM_PROMPT = (
    _V1_CORE
    + "\n\n## Referenzbeispiele — dieses Niveau ist der Maßstab\n\n"
    + "Beispiel 1 (Kochen):\n"
    + _EXAMPLE_KOCHEN
    + "\n\nBeispiel 2 (Cocktail):\n"
    + _EXAMPLE_COCKTAIL
    + "\n\nDie Beispiele zeigen Struktur, Präzision und Tipp-Qualität. Kopiere niemals ein Beispielrezept — erstelle immer ein neues Gericht passend zu den Nutzervorgaben."
)


def build_user_prompt(params: GenerateParams) -> str:
    # identical wizard-to-prompt mapping as v1; volatile content stays here
    return _build_user_prompt_v1(params)


__all__ = ["PROMPT_VERSION", "SYSTEM_PROMPT", "VARIATION_HINT", "build_user_prompt"]
