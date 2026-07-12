---
name: recipe-motifs
description: Neues Karten-Motiv (Gericht/Drink) im Zauberkoch-Illustrationsstil erzeugen und registrieren — flache Vektor-SVGs, KEINE KI-Rasterbilder. Nutzen bei "neues Motiv für …" o. ä.
argument-hint: "<motiv-name, z. B. tiki | weinglas | suppe | dessert | burger>"
---

# Rezept-Motiv erzeugen: `$ARGUMENTS`

Alle Karten-Illustrationen leben in `frontend/src/components/recipe/RecipeMotif.tsx`.
Erzeuge das neue Motiv **exakt in diesem Stil-System** und registriere es vollständig.

## Stil-Spezifikation (verbindlich)

Referenz-Ästhetik: flache, freundliche Vektor-Illustration mit weicher Tiefe
(wie klassische Material-Cocktail-Apps) — kein Foto-Realismus, keine Outlines
um alles, keine harten Schwarztöne.

1. **Canvas**: `viewBox="0 0 120 120"`, Motiv mittig, unten ~12 px Luft.
2. **Bodenschatten** (immer zuerst): `<ellipse cx="60" cy="~105" rx="26–40" ry="5–6" fill="#000" opacity="0.08" />`.
3. **Glas/Keramik**: Silhouette als `<path>` mit leichter Verjüngung und
   gerundeten Ecken (`Q`-Kurven an den Standfüßen). Glas = `fill="#fff" opacity="0.5"`,
   Keramik = eigener vertikaler `linearGradient` (oben heller).
4. **Flüssigkeit**: eigener vertikaler `linearGradient` (`x1=0 y1=0 x2=0 y2=1`,
   oben hell, unten satt), 2–4 px innerhalb der Glaswand, oben ~1/4 Luft (Füllstand).
   Gradient-IDs IMMER mit dem `id`-Prop prefixen: `` id={`${id}-liq`} `` —
   sonst kollidieren mehrere Karten in einer Liste.
5. **Eis**: gedrehte `<rect rx="4–5">` in `#fff` mit `opacity 0.4–0.5`,
   optional kleinerer Highlight-Rect obendrauf.
6. **Glanz**: Rim-Linie (`stroke="#fff" strokeWidth="3" opacity 0.85`) +
   eine vertikale/gebogene Shine-Linie (`opacity 0.3–0.5`, `strokeLinecap="round"`).
7. **Garnitur/Toppings**: einfache geometrische Formen mit je einem helleren
   Akzent (Zitrusrad = Kreis + hellerer Innenkreis + Segmentlinien; Kirsche =
   Kreis + Mini-Highlight-Kreis; Lachs = gerundetes Rect + heller Streifen).
   Naturfarben, satt aber nicht neon.
8. **Farbwelt**: warm & appetitlich — Gelb `#ffe27a→#f5b73c`, Amber
   `#f0a95c→#c96f2e`, Rosé `#ff9c9c→#e85d75`, Limette `#7ed26a/#c9ef9a`,
   Tomate `#e6503f`, Basilikum `#4fae5c`, Keramik-Teal `#3f7d8c→#2c5a66`,
   Reis/Teller `#fdfaf3/#f7f3ec`. Neue Farben nur in dieser Sättigungs-Liga.
   Feste Farben (theme-unabhängig) — die Motive funktionieren auf Light & Dark.
9. **Verboten**: Text, Emojis, Filter/Blur, `<image>`, Animationen,
   CSS-Variablen in Fills, IDs ohne `${id}`-Prefix.

## Generator-Prompt (für neue Motive, auch außerhalb von Claude Code nutzbar)

> Erzeuge eine React-SVG-Komponente `function <Name>({ id, ...svg }: SvgProps)`
> für das Motiv „<BESCHREIBUNG>" im Zauberkoch-Illustrationsstil:
> flacher Vektor-Look, viewBox 0 0 120 120, weicher Bodenschatten-Ellipse
> (#000, opacity 0.08), Hauptobjekt aus Pfaden mit gerundeten Ecken,
> vertikale Flüssigkeits-/Material-Gradienten (oben hell), translucentes
> Weiß für Glas (opacity 0.5) und Eis (0.4–0.5), Rim- und Shine-Highlights
> in Weiß, geometrische Garnitur mit hellerem Akzent pro Form, warme
> Naturfarben. Alle Gradient-IDs als `${id}-<name>`. Keine Filter, kein
> Text, keine Outlines um alles.

## Registrierung (Pflicht-Checkliste)

1. Komponente in `RecipeMotif.tsx` ergänzen (unter den bestehenden).
2. `Motif`-Union + `switch` in `RecipeMotif()` erweitern.
3. `motifForRecipe()`-Keywords ergänzen (Cocktails matchen über `glas` zuerst;
   Gerichte über Titel/Tags/Küche). Reihenfolge beachten: spezifisch vor generisch.
4. Testfälle in `RecipeMotif.test.ts` für die neuen Keywords.
5. Visuell prüfen: Verlauf-Seite mit Mock-Items in Light UND Dark screenshotten.
6. `npm test` + `npx tsc --noEmit` grün; SW-Cache-Bump nur bei Shell-Änderung.
