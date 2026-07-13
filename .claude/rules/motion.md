---
paths:
  - "frontend/src/**"
description: Motion-Regeln (M3 Expressive Motion, Spring-Physik)
---

# Motion-Regeln

- **Alle Animationen mit echter Spring-Physik** (Motion-Library) — keine linearen `ease-in-out`-CSS-Transitions als Animations-Ersatz, keine Inline-Magic-Numbers (stiffness/damping/duration/ease).
- **MD3-Expressive-Spring-Tokens: `src/motion/tokens.ts`** ist die Single Source of Truth (`fastSpatial`/`defaultSpatial`/`slowSpatial` = spatial mit Overshoot per `bounce`; `effectsFast`/`effectsDefault` = Opacity/Farbe, **nie** Overshoot; `staggerIn`, `reducedFade`, benannte Variant-Presets). **Räumliche Props (scale/translate/rotate) dürfen überschwingen, Fades (opacity/color) NIE.** `src/motion/springs.ts` (stiffness/damping) ist der ältere Preset-Satz und bleibt gültig — neue Animationen bevorzugt über `tokens.ts`.
- **Nur `transform` und `opacity` animieren** (60 fps auf Mittelklasse-Android). `will-change` gezielt und temporär, nie global. Keine Layout-Properties (width/height/top) animieren — Container-Transform über Scale/Clip lösen.
- **`prefers-reduced-motion` ist Pflicht auf jeder Animation**: Springs → schnelle Fades (zentraler Guard in `src/motion/`, nicht pro Komponente improvisieren).
- Signatur-Patterns des Projekts: Shared-Element Karte→Detail (Container Transform, native View Transitions — s. u.), Chip-Select mit Overshoot, gestaffelte Streaming-Entrances (stagger), Digit-Roll im Portionen-Stepper, Bottom Sheet mit Drag + Velocity-Snap, elastischer Check + Strike-Sweep, FAB→Dialog-Morph, Theme-/Modus-Farbmorph, **Conjure-Stage** (264px-Szene, Orbit-Emojis + Atmungs-Puls + rotierende Wartetexte `strings.stream.conjuringCycle` + event-getriebene Zutaten-Drops + Voll→Kompakt-Morph, `ConjureStage.tsx`), Titel-Wort-Reveal beim Streaming, **Favorit-Reward** (`FavoriteButton.tsx`: Press→Pop 0.8→1.3→1 + Rotation + Partikel-Burst in Theme-Farben; Un-Favorisieren nur Dip, kein Burst), **Hero-Moment** beim Fertigwerden (Karten-Settle-Pop + Reveal-Glow-Sweep + `navigator.vibrate` + gestaffelte Action-Buttons, `GeneratePage`).
- Ambient-Loops (Orbits, Blubbern, Shaker-Wackeln) dürfen `easeInOut`/lineare Tweens mit `repeat: Infinity` sein — Springs sind für One-Shot-Bewegung.
- Gesten: Velocity entscheidet über Snap/Zurückfedern; Drag immer mit Pointer-Events, nicht mit Scroll konkurrieren lassen.
- Skeleton/Shimmer nur, wo Streaming nicht greift.

## Route-/View-Transitions (native View Transitions API)

Route-Wechsel laufen NICHT über framer, sondern über `document.startViewTransition` — orchestriert im **`ViewTransitionProvider`** (`src/state/viewTransition.tsx`). **Alle** internen Navigationen gehen über `useViewTx().go(to, {sharedId?})`, nie über rohes `navigate()` (sonst keine Transition). Muster:
- **Container Transform** Liste→Detail: die geklickte Karte und der Detail-Hero benennen ihre **Grafik** (`RecipeMotif style={{viewTransitionName}}`) + **Titel** mit festen Namen `zk-shared-motif`/`zk-shared-title` — aber NUR am aktiven Element (`activeId === recipe.id`), sonst verletzt man die Snapshot-Eindeutigkeit. Motiv-Seed muss auf beiden Seiten `titel` sein, sonst morpht es zwischen zwei Varianten.
- **Fade Through** zwischen Top-Level-Tabs (`go(to)` ohne `sharedId`) = nur Root-Crossfade.
- CSS in `styles/base.css`: Theme-Reveal-Regeln sind auf `.zk-theme-vt` gescopet (sonst würgen sie den Route-Root-Crossfade ab); `::view-transition-group(zk-shared-*)` = MD3-Emphasized `cubic-bezier(.2,0,0,1)` 360 ms; Root = `zk-vt-fade-in/out` (320/180 ms).

**Diese vier Dinge NIE brechen — sie killen den Morph (jeweils hart erarbeitet):**
1. **Kein `flushSync(navigate)`** — react-router v7 committet nicht synchron. Der VT-Callback gibt eine Promise zurück, die der Scroll-`useLayoutEffect` (auf `location.key`) via `pendingResolve`-Ref beim echten Route-Commit auflöst (+ 500 ms Safety-Timeout). rAF ist während der VT-Callback-Phase ausgehungert — nicht darauf pollen.
2. **Ziel-Seite muss synchron mit Hero rendern.** `RecipeDetailPage` ist `lazy`, wird aber per verstecktem Off-Route-Mount vorgewärmt (`{me && !'/rezept/' && <div hidden><Suspense><RecipeDetailPage/></Suspense></div>}` in `App.tsx`), damit `React.lazy` vor der Navigation resolved ist. **Nicht eager importieren** (zieht RecipeView/RecipeMotif ~12 KB gz in den Entry → Lighthouse). RecipeDetailPage muss ohne Route-Params renderbar bleiben (rendert dann Ladezustand).
3. **Detail-Query VOR der Navigation cachen** (`RecipeCard` `ensureQueryData` + `onPointerDown`-Prefetch) — ein Ladezustand ohne Hero = Morph ohne Ziel.
4. **framer-Entrance auf dem Hero bei `isShared` unterdrücken** (`RecipeView`: `{...(reduced || isShared ? {} : riseIn)}`) — eine Live-Animation am Motiv-Container bricht die VT ab.

`prefers-reduced-motion` oder fehlendes `startViewTransition` → normale Navigation ohne VT. Scroll: `history.scrollRestoration='manual'` (main.tsx), Position wird in `go()` synchron vor der Navigation gemerkt, Reset (vorwärts) / Restore (POP) im Scroll-`useLayoutEffect`.
