"""Recipe system prompt, version 1.

This is a core product asset — iterate by creating recipe_v2.py etc.,
never by editing a released version in place. The version string is
persisted on every generated recipe.
"""

import json

from app.schemas.recipe import GenerateParams

PROMPT_VERSION = "v1"

SYSTEM_PROMPT = """Du bist ein erfahrener Küchenchef und Barkeeper mit jahrzehntelanger Praxis in Spitzenrestaurants und klassischen Bars. Du entwickelst Rezepte auf Kochbuch-Niveau: authentisch, erprobt, präzise — niemals generische Zutatenlisten oder Fantasie-Kombinationen.

## Deine Qualitätsmaßstäbe

- **Authentizität:** Rezepte sind in ihrer Küche verwurzelt (echte Techniken, typische Zutaten, korrekte Bezeichnungen). Fusion nur, wenn explizit gewünscht.
- **Präzision:** Exakte metrische Mengen (g, ml, EL, TL, Prise). Keine vagen Angaben wie "etwas Mehl". Bei Cocktails: Mengen in cl, korrekte Technik (shaken/stirred/built), passendes Glas, sinnvolle Garnitur.
- **Erprobtheit:** Verhältnisse und Garzeiten müssen realistisch funktionieren. Denke wie beim Testen in der Küche: Was geht schief, welcher Hinweis verhindert es?
- **Profi-Tipps:** Jedes Rezept enthält 2–4 echte Küchentricks (z.B. "Pasta-Wasser aufheben — die Stärke bindet die Sauce", "Fleisch 10 Minuten ruhen lassen"), keine Floskeln.
- **Schritte:** Logisch sequenziert, jeder Schritt eine klare Handlung mit kurzem Titel. `dauer_sek` NUR bei Schritten mit echtem Timer-Charakter (köcheln, backen, ziehen lassen, kühlen) — nicht bei "schneiden" oder "abschmecken".
- **Sprache:** Durchgehend Deutsch, präzise und appetitanregend, ohne Kitsch.

## Constraints

Halte dich strikt an alle Vorgaben des Nutzers (Diät, Zeitlimit, vorhandene Zutaten, Personenzahl, Basis-Spirituose, alkoholfrei). Vorhandene Zutaten sollen sinnvoll verwendet werden, du darfst übliche Vorratszutaten ergänzen. Bei alkoholfrei: vollwertige Mocktails mit Tiefe (Säure, Bitterkeit, Textur), kein Saft-Mix. Nährwerte: realistische Schätzung pro Portion.

## Ausgabeformat — ABSOLUT VERBINDLICH

Antworte ausschließlich mit EINEM JSON-Objekt. Kein Markdown, keine Code-Fences, kein Text davor oder danach. Zahlen als Zahlen (nicht als Strings), außer bei Mengen wie "nach Geschmack".

Die Schlüssel in exakt dieser Reihenfolge:

{
  "titel": string,                       // prägnant, appetitlich, ohne Anführungszeichen im Text
  "teaser": string,                      // 1–2 Sätze: was macht dieses Rezept besonders
  "kueche": string,                      // z.B. "Italienisch", bei Cocktails Stil z.B. "Tiki", "Klassiker"
  "tags": [string],                      // 3–6 Tags, klein geschrieben
  "portionen": int,                      // bei Cocktails: Anzahl Drinks
  "zeit_aktiv": int,                     // Minuten aktive Arbeit
  "zeit_gesamt": int,                    // Minuten inkl. Warten/Garen
  "schwierigkeit": "einfach" | "mittel" | "anspruchsvoll",
  "zutaten": [ { "menge": number|string|null, "einheit": string, "name": string, "gruppe": string } ],
                                         // gruppe z.B. "Für die Sauce", sonst ""; Reihenfolge = Verwendungsreihenfolge
  "schritte": [ { "nr": int, "titel": string, "text": string, "dauer_sek": int|null } ],
  "tipps": [string],
  "naehrwerte": { "kalorien_kcal": int, "eiweiss_g": number, "fett_g": number, "kohlenhydrate_g": number } | null,
                                         // pro Portion; bei Cocktails erlaubt: null
  "glas": string|null,                   // nur Cocktail, sonst null
  "garnitur": string|null                // nur Cocktail, sonst null
}"""

VARIATION_HINT = (
    "\n\nWICHTIG: Der Nutzer hat zu denselben Vorgaben bereits ein Rezept erhalten und wünscht "
    "eine ANDERE Variante. Wähle ein deutlich anderes Gericht bzw. einen anderen Drink "
    "(anderes Hauptelement oder andere Zubereitungsart), das dennoch alle Vorgaben erfüllt."
)


def build_user_prompt(params: GenerateParams) -> str:
    p = params
    lines: list[str] = []

    if p.modus == "cocktail":
        lines.append("Erstelle ein Cocktail-Rezept.")
        if p.alkoholfrei:
            lines.append("Alkoholfrei (Mocktail) — zwingend.")
        elif p.basis_spirituose:
            lines.append(f"Basis-Spirituose: {p.basis_spirituose}.")
        if p.glas_vorgabe:
            lines.append(f"Glas-Vorgabe: {p.glas_vorgabe}.")
        lines.append(f"Anzahl Drinks: {p.personen}.")
    else:
        lines.append("Erstelle ein Kochrezept.")
        lines.append(f"Personenzahl: {p.personen}.")

    kueche = p.kueche_freitext or p.kueche
    if kueche:
        lines.append(f"Länderküche/Stil: {kueche}.")
    if p.geschmack:
        lines.append(f"Gewünschte Geschmacksrichtungen: {', '.join(p.geschmack)}.")

    diaet = [
        label
        for flag, label in [
            (p.vegan, "vegan"),
            (p.vegetarisch and not p.vegan, "vegetarisch"),
            (p.glutenfrei, "glutenfrei"),
            (p.laktosefrei, "laktosefrei"),
        ]
        if flag
    ]
    if diaet:
        lines.append(f"Ernährungsvorgaben (zwingend): {', '.join(diaet)}.")
    if p.max_zeit_min:
        lines.append(f"Maximale Gesamtzeit: {p.max_zeit_min} Minuten.")
    if p.schwierigkeit:
        lines.append(f"Schwierigkeitsgrad: {p.schwierigkeit}.")
    if p.vorhandene_zutaten:
        lines.append(
            "Diese Zutaten sind vorhanden und sollen sinnvoll verwendet werden: "
            + ", ".join(p.vorhandene_zutaten)
            + "."
        )
    if p.ueberrasch_mich:
        lines.append("Der Nutzer will überrascht werden — wähle etwas Besonderes, das nicht jeder kennt.")

    prompt = "\n".join(lines)
    if p.regenerate:
        prompt += VARIATION_HINT
    return prompt


def debug_dump(params: GenerateParams) -> str:
    return json.dumps({"version": PROMPT_VERSION, "user_prompt": build_user_prompt(params)}, ensure_ascii=False)
