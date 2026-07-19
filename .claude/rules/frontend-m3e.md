---
paths:
  - "frontend/src/**"
description: Material 3 Expressive — kondensierter Kanon + Projektentscheidungen (verbindliche Referenz)
---

# Material 3 Expressive — Kanon (Zauberkoch)

Kondensierte, verbindliche Referenz. Detailregeln: `frontend.md` (Tokens/i18n/Struktur) und `motion.md` (Springs, View Transitions, Morph-Killer). Bei Widerspruch gilt die detailliertere Datei; Änderungen hier UND dort synchron halten.

## Projektentscheidungen (getroffen, nicht neu diskutieren)

- **Motion-Scheme: EXPRESSIVE** app-weit (Springs mit Overshoot auf spatial). Standard-Scheme nur implizit über die effects-Tokens (kein Bounce auf Opacity/Farbe).
- **Seed-Farben:** Kochen = Basilikum-Grün, Drinks/Cocktail = Violett — je Light+Dark, umgesetzt als vollständige Rollen-Sets in `src/styles/tokens.css` (`--c-primary…`, `--c-*-container`, `--c-surface`-Container-Skala, `--c-outline*`, on-colors). **Nie Hex in Komponenten.** Moduswechsel = animierter Token-Morph (`data-mode`/`data-theme` am Root).
- **Benannte Hero-Momente** (bewusst gestaltet, Expressive-Spring + ggf. Haptik): 1. **Conjure-Stage** (KI-Generierung, 320px Kessel/Shaker + Zutaten-Drops), 2. **Fertig-Moment** (Settle-Pop + Glow-Sweep + SparkBurst + vibrate), 3. **Favorit-Reward** (rewardPop + Partikel), 4. **Theme-Circular-Reveal** & **CRT-Logout**, 5. **Karte/Tile→Detail-Container-Transform** (View Transitions, inkl. Browser-Back).
- **Shape-Morph beim Press** auf gefüllten Buttons (Pille→gerundetes Rechteck via `--shape-press`): dokumentierte Ausnahme von „nur transform/opacity" — border-radius ist reiner Paint auf kleiner Fläche, transitioniert mit Effects-Timing, unter `prefers-reduced-motion` deaktiviert.

## Single Source of Truth

| Was | Wo |
|---|---|
| Farben, Shapes (`--shape-xs…full`, `--shape-press`), Typo (baseline + `-em` emphasized), Spacing | `frontend/src/styles/tokens.css` |
| Springs: `fastSpatial`/`defaultSpatial`/`slowSpatial` (bounce) · `effectsFast`/`effectsDefault`/`countUp` (kein Bounce) · `reducedFade` · benannte Presets (`heroEnter`, `rewardPop`, `errorIn`, `shuffleWiggle` …) | `frontend/src/motion/tokens.ts` (älterer Satz `springs.ts` bleibt gültig) |
| Shared-Element-/Route-Morphs (`zk-shared-*`, `zk-d-*`) | `styles/base.css` + `state/viewTransition.ts`, Regeln in `motion.md` |
| Motion-Kurzreferenz | `docs/MOTION.md` |

**Keine Magic Numbers** in Komponenten — Physik/Farben/Shapes/Typo nur über Tokens.

## Kanon-Kurzfassung

- **Motion:** Jede sichtbare Zustandsänderung animiert (nie hartes Snapping). Spatial (Position/Größe/Rotation/Shape) darf overshooten; Effects (Farbe/Opacity) NIE. Speed nach Größe: klein→fast, Fullscreen/Route→slow. Springs sind interruptible (Motion-Lib), keine linearen ease-in-out-Ersatzanimationen. Bounce gezielt (Hero/Bestätigung), nicht flächendeckend.
- **Shapes:** Spannung statt Uniformität — volle Rundung für Aktionen (Pille), XL-Karten, Press-Morph auf Hero-Buttons. Neue Stufen nur als Token.
- **Typo:** baseline-Set + **emphasized-Set** (`--type-*-em`, Variable-Font-Gewichtsachse) für Hero-Titel/emotionale Betonung. Sentence case; UI-Strings nur über `i18n/de.ts`.
- **Shared Elements:** Wo Liste↔Detail zusammengehören, IMMER Container-Transform (View Transitions, `useViewTransitionState`; Quellen: RecipeCard, PlanEntryRow, Einkauf-Nach-Gericht). Neue Quellen: Morph-Killer-Checkliste in `motion.md` lesen (Prefetch vor Navigation, Entrance-Suppression, eindeutige VT-Namen).
- **A11y-Gate (hart):** reduced-motion-Fallback auf JEDER Animation (`reducedFade`/statisch); Touch-Targets ≥ 48px; sichtbarer `:focus-visible`; Kontrast ≥ AA (Lighthouse-A11y 100 halten); Text-Skalierung 200 % ohne Layout-Bruch; aria-Labels über i18n.
- **Footer:** `© {Jahr} Martin Pfeffer | celox.io | vN` — Jahr/Version zentral (Version aus SW-Cache injiziert), nicht pro Komponente.

## Pflege

Bei bewussten Abweichungen: diese Datei + betroffene Detail-Regel im selben Commit aktualisieren. Bei App-Shell-Änderungen SW-Cache bumpen (`public/sw.js`, CLAUDE.md nachführen).
