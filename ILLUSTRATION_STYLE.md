# Zauberkoch Illustration & Icon Style

Verbindliche Stil-Referenz für alle Vektorgrafiken der App. Zwei Ebenen:
**Motive** (Rezept-Illustrationen, 120×120) und **Icons** (UI-Symbole, 24×24).
Referenz-Ästhetik für beide: **Google Material Design Flat (~2016)** —
reine geometrische Farbflächen, explizit KEIN Emoji-Look.

## Gemeinsame Regeln (Motive + Icons)

1. **Reine Vektorgrafik** aus einfachen geometrischen Grundformen (Kreise,
   Rechtecke, Trapeze, Pfade mit wenigen Punkten).
2. **Keine Konturen/Outlines** — Formen trennen sich nur durch Farbe.
   Strokes sind ausschließlich als *Band-Formen* erlaubt (Ring, Bogen,
   Spaghetti-Strang), nie als Umrandung einer Fläche.
3. **Keine Glanzeffekte**: keine Highlights, Shine-Striche, Rim-Lights,
   kein 3D, keine Blur-/Drop-Shadows, keine Filter.
4. **Gradients** nur linear und INNERHALB einer Fläche, subtil
   (dunkler → heller Ton derselben Farbe). IDs immer `${id}`-geprefixt.
5. **Transparenz** als Gestaltungsmittel: halbtransparente Überlagerungen
   0.3–0.6 für Glas, Eis, Dampf, sekundäre Formen.
6. **Verboten**: Text, Emojis, `<image>`, Filter, eingebettete Rasterdaten.

## Motive (Rezept-Karten, `RecipeMotif.tsx`)

- Canvas `viewBox="0 0 120 120"`, Objekt füllt 60–70 %, viel Whitespace.
- Gesamtes Objekt 5–10° rotiert; flacher Bodenschatten (`<Ground/>`,
  #263238, opacity 0.08) bleibt außerhalb der Rotation.
- Max. 4–6 gedeckte, satte Farben (Material-600/400-Niveau).
- Varianten-System + Registrierung: siehe `.claude/skills/recipe-motifs/`.

## Icons (`frontend/src/components/icons/`)

- **Grid**: alle Icons auf `viewBox="0 0 24 24"`, optisch gleiches Gewicht
  (~2px Detailstärke, Füllgrad an den Material-Filled-Icons orientiert).
- **Funktionale Icons** (Navigation, Aktionen, Stats): monochrom mit
  `currentColor` — sie erben die Textfarbe und damit automatisch
  Theme/Modus/Aktiv-Zustand. Sekundäre Formteile über `opacity` 0.35–0.65,
  nie über zusätzliche Farben.
- **Marken-Icons** (`logo`, `wand`): 2–3 Farben über Design-Tokens
  (`var(--c-primary)`, `var(--c-tertiary)`, `var(--icon-gold)`) — nie
  Hex-Werte inline (Token in `tokens.css`).
- **Universelle Symbole** (Teilen, Löschen, Zahnrad …) folgen der
  Material-Filled-Geometrie; **charakterstarke Symbole** (Zauberstab,
  Kochmütze, Pfanne, Gläser, Party) sind eigene Zeichnungen im selben Stil.
- **Verwendung** ausschließlich über `<Icon name="…" size={…} />`
  (`components/icons/Icon.tsx`). Größen-Konvention: Nav 24 · Header-Logo 28
  · Text-Buttons 18 · Inline-Stats 15–16 · Chip-Affixe 13–14 ·
  Empty-States 48+.
- **Kein Icon-Font, keine externe Icon-Library** — das Set ist Teil der
  Markenidentität. Neue Icons: Glyph in `glyphs.tsx` ergänzen (Registry ist
  typisiert), Testliste in `icons.test.ts` erweitern.
- **Ausnahme**: die Zutaten-Emojis der Kessel-Animation
  (`lib/zutatEmoji.ts`, `ConjureStage.tsx`) bleiben bewusst Emojis —
  winzige dekorative Partikel, die von der Vielfalt leben.

## Generator-Prompt für neue Icons

> Erzeuge einen SVG-Glyph (24×24 viewBox) für „<BESCHREIBUNG>" im Stil von
> Google Material Design Flat Icons: gefüllte geometrische Grundformen,
> keine Konturen/Outlines, keine Glanzeffekte, kein Emoji-Look.
> Monochrom mit `currentColor`; sekundäre Formteile über opacity 0.35–0.65.
> Optisches Gewicht wie Material-Filled-Icons (~2px Detailstärke),
> 1–2px Rand-Padding. Ring-/Bogenformen als 2px-Stroke mit runden Enden
> erlaubt (Band-Form, keine Umrandung).
