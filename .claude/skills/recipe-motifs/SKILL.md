---
name: recipe-motifs
description: Neues Karten-Motiv (Gericht/Drink) im Zauberkoch-Illustrationsstil erzeugen und registrieren — flache Vektor-SVGs, KEINE KI-Rasterbilder. Nutzen bei "neues Motiv für …" o. ä.
argument-hint: "<motiv-name, z. B. tiki | weinglas | suppe | dessert | burger>"
---

# Rezept-Motiv erzeugen: `$ARGUMENTS`

Alle Karten-Illustrationen leben in `frontend/src/components/recipe/RecipeMotif.tsx`.
Erzeuge das neue Motiv **exakt in diesem Stil-System** und registriere es vollständig.

## Stil-Spezifikation (verbindlich)

Referenz-Ästhetik: **Google Material Design Flat Illustration (~2016)** —
wie in klassischen Material-Apps. Explizit KEIN Emoji-Look.

1. **Canvas**: `viewBox="0 0 120 120"`, Objekt füllt ~60–70 %, viel Whitespace.
2. **Rotation**: das gesamte Objekt 5–10° gedreht (`<g transform="rotate(±6 60 62)">`)
   — der flache Bodenschatten bleibt AUSSERHALB der Rotation (horizontal).
3. **Bodenschatten**: flache Ellipse ohne Blur (`<Ground/>`, #263238, opacity 0.08).
4. **Reine Farbflächen**: einfache geometrische Formen (Trapeze, Rechtecke,
   Kreise, Pfade mit wenigen Punkten). Formen trennen sich NUR durch Farbe —
   **keine Konturen/Outlines, keine Glanz-/Shine-Linien, keine Highlights,
   kein 3D, keine Blur-Schatten**. (Strokes sind nur als "Band-Formen"
   erlaubt, z. B. Spaghetti-Stränge — nie als Umrandung.)
5. **Gradients**: nur lineare Verläufe INNERHALB einer Fläche, subtil
   (dunkler → heller Ton derselben Farbe, z. B. Flüssigkeit, Keramik).
   IDs IMMER `${id}`-geprefixt.
6. **Transparenz**: halbtransparente Überlagerungen 0.3–0.6 für Glas
   (#90a4ae, ~0.35–0.45), Eis (weiß, ~0.4), Dampf (#b0bec5, ~0.45),
   Bubbles (weiß, ~0.55).
7. **Farben**: max. 4–6 pro Grafik, gedeckt aber satt (Material-600/400-Niveau:
   #e53935, #fb8c00, #fbc02d, #7cb342, #00838f, #c62828, #6d4c41, #37474f …).
8. **Verboten**: Text, Emojis, Filter/Blur, `<image>`, Animationen,
   Highlight-Punkte auf Früchten, weiße Rim-/Shine-Striche.

## Generator-Prompt (für neue Motive, auch außerhalb von Claude Code nutzbar)

> Erzeuge eine React-SVG-Komponente `function <Name>({ id, v = 0, ...svg }: SvgProps)`
> für das Motiv „<BESCHREIBUNG>" im Stil von Google Material Design Flat
> Illustrations (~2016): reine Vektorgrafik aus einfachen geometrischen
> Formen, KEINE Outlines/Strokes als Kontur, KEINE Glanzeffekte/Highlights,
> KEIN Emoji-Look/3D, flacher blur-freier Bodenschatten (außerhalb der
> Rotation), das Objekt 5–10° rotiert, max. 4–6 gedeckte satte Farben,
> subtile lineare Gradients innerhalb der Flächen (dunkel→hell derselben
> Farbe, IDs als `${id}-<name>`), halbtransparente Überlagerungen (0.3–0.6)
> für Glas/Eis/Dampf, Objekt füllt 60–70 % der viewBox 0 0 120 120.

## Varianten-System

Jedes Motiv kann mehrere **Varianten** haben (deterministisch per Titel-Hash,
damit dasselbe Rezept immer dieselbe Grafik behält, verschiedene Gerichte
derselben Kategorie aber unterschiedlich aussehen):

- Anzahl in `MOTIF_VARIANTS` (RecipeMotif.tsx) **UND** `MOTIF_VARIANTS`
  (backend og_image.py) — beide müssen identisch sein (Paritäts-Tests!).
- Hash: Summe der UTF-16-Code-Units modulo Anzahl (`variantFor` / `variant_for`)
  — bei Änderungen beide Seiten + die gespiegelten Test-Konstanten anpassen.
- Eine Variante ist ein **anderes Gericht derselben Kategorie** (Pomodoro →
  Pesto → Carbonara), nie nur ein Umfärben: Flüssigkeits-/Saucen-Farbwelt des
  echten Gerichts + mindestens ein struktureller Unterschied (Garnitur,
  Topping, Glas-Inhalt).
- Komponente: `function Name({ id, v = 0, ...svg }: SvgProps)`, v0 = Basis.
- Nach JEDER Motiv-Änderung: `cd frontend && npm run export:motifs`
  (schreibt `backend/app/assets/motifs/<name>-v<k>.png`).

## Registrierung (Pflicht-Checkliste)

1. Komponente in `RecipeMotif.tsx` ergänzen (unter den bestehenden).
2. `Motif`-Union + `switch` in `RecipeMotif()` erweitern.
3. `motifForRecipe()`-Keywords ergänzen (Cocktails matchen über `glas` zuerst;
   Gerichte über Titel/Tags/Küche). Reihenfolge beachten: spezifisch vor generisch.
4. Testfälle in `RecipeMotif.test.ts` für die neuen Keywords.
5. Visuell prüfen: Verlauf-Seite mit Mock-Items in Light UND Dark screenshotten.
6. Bei neuen Varianten: `MOTIF_VARIANTS` in beiden Sprachen erhöhen + `npm run export:motifs` + backend `STYLE_VERSION` bumpen (OG-Cache).
7. `npm test` + `pytest` + `npx tsc --noEmit` grün; SW-Cache-Bump nur bei Shell-Änderung.
