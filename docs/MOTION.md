# Motion-Sprache — Kurzreferenz

> Verbindliche Regeln: `.claude/rules/motion.md`. Audit + Priorisierung: `MOTION-PLAN.md`.

## Prinzipien

1. **Physik statt Kurven:** Alles bewegt sich über Springs (Motion-Library). Spatial darf überschwingen, Effects (Opacity/Farbe) nie. Nur `transform`/`opacity`.
2. **Eine Sprache:** Gleiche Interaktion ⇒ gleiche Bewegung, appweit. Presets sind benannt und leben zentral — Komponenten hardcoden keine Physik.
3. **Ein fokaler Effekt pro Moment.** Motion dient dem Inhalt; Zurückhaltung schlägt Effekt.
4. **`prefers-reduced-motion` überall:** Springs → `reducedFade`/statisch, nie nur „schneller".
5. **Route-Morphs = View Transitions API** (react-router built-in), niemals framer auf Route-Ebene — der Browser-Back-Morph hängt daran (Details/Fallstricke: rules/motion.md).

## Token-Module

**`src/motion/tokens.ts`** (MD3 Expressive, bevorzugt für Neues):

| Preset | Klasse | Einsatz |
|---|---|---|
| `fastSpatial` (0.22s, bounce .42) | spatial | Mikro-Interaktionen, kleine Elemente |
| `defaultSpatial` (0.4s, bounce .3) | spatial | Karten, Sheets, Indikatoren |
| `slowSpatial` (0.62s, bounce .5) | spatial | Hero-Momente |
| `effectsFast` / `effectsDefault` | effects | Fades/Farbe, nie Overshoot |
| `countUp` (0.7s, bounce 0) | effects | Zahlen-Count-up (nie über den Wert hinaus) |
| `reducedFade` | — | reduced-motion-Ersatz |
| `staggerIn(i)` | helper | Kaskaden-Entrances (20–50 ms Basis) |
| `heroEnter` / `heroItem` | variants | Hero-/Content-Entrance mit Settle |
| `rewardPop` / `dismissDip` / `pressStar` | keyframes | Favorit-Reward-Familie |
| `errorIn` | variants | Fehler-Entrance: sanfter, abklingender Shake |
| `shuffleWiggle` | keyframes | „Überrasch mich"-Geschenk-Wiggle (Hover/Press) |

**`src/motion/springs.ts`** (älterer Satz, weiter gültig): `spring`/`springBouncy`/`springSnappy`/`springSoft`, `riseIn`/`popIn`, `pressScale`, `stagger(i)`.

## Signatur-Momente (wo was lebt)

- **Karte→Detail-Morph** (inkl. Browser-Back): VT-Namen `zk-shared-motif/title` — `RecipeCard`/`RecipeView`, CSS `styles/base.css`
- **Conjure-Stage** (KI-Loader, 320px Kessel/Shaker): `components/recipe/ConjureStage.tsx`
- **Hero-Moment** bei Fertigstellung (Settle-Pop + Glow-Sweep + Haptik + `SparkBurst`): `GeneratePage`
- **Favorit-Reward**: `FavoriteButton.tsx` · **Digit-Roll**: `NumberTicker.tsx` · **Count-up**: `recipe/CountUp.tsx`
- **Listen-States**: `ui/StateNote.tsx` (Loading/Empty, entrance-only — bewusst keine Exit-Choreo neben VT-sensiblen Listen)
- **Einkaufslisten-Check** (elastischer Tick + Strike), Drag-Reorder: `ShoppingPage`
- **Theme-Reveal** (Circular, JS-WAAPI auf VT-Pseudo): `state/app.tsx` · **CRT-Logout**: `CrtOff.tsx`
- **Nav-Pille / Segmented-Thumb**: `layoutId`-Morph (`App.tsx`, `ui/index.tsx`)

## Neue Animation hinzufügen — Checkliste

1. Passendes Preset in `tokens.ts` wiederverwenden; fehlt eines: **benannt** dort ergänzen (nie inline).
2. `useReducedMotion()` → `reducedFade` oder statisch.
3. Nur `transform`/`opacity`; `will-change` gezielt.
4. Route-/Shared-Element-Pfad? Erst rules/motion.md lesen (Morph-Killer-Liste).
5. Keyframe-Presets **ohne** `as const` (motion braucht mutable Arrays).
