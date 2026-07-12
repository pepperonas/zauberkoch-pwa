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
- Signatur-Patterns des Projekts: Shared-Element Karte→Detail (Container Transform), Chip-Select mit Overshoot, gestaffelte Streaming-Entrances (stagger), Digit-Roll im Portionen-Stepper, Bottom Sheet mit Drag + Velocity-Snap, elastischer Check + Strike-Sweep, FAB→Dialog-Morph, Theme-/Modus-Farbmorph, **Conjure-Stage** (264px-Szene, Orbit-Emojis + Atmungs-Puls + rotierende Wartetexte `strings.stream.conjuringCycle` + event-getriebene Zutaten-Drops + Voll→Kompakt-Morph, `ConjureStage.tsx`), Titel-Wort-Reveal beim Streaming, **Favorit-Reward** (`FavoriteButton.tsx`: Press→Pop 0.8→1.3→1 + Rotation + Partikel-Burst in Theme-Farben; Un-Favorisieren nur Dip, kein Burst), **Hero-Moment** beim Fertigwerden (Karten-Settle-Pop + Reveal-Glow-Sweep + `navigator.vibrate` + gestaffelte Action-Buttons, `GeneratePage`).
- Ambient-Loops (Orbits, Blubbern, Shaker-Wackeln) dürfen `easeInOut`/lineare Tweens mit `repeat: Infinity` sein — Springs sind für One-Shot-Bewegung.
- Gesten: Velocity entscheidet über Snap/Zurückfedern; Drag immer mit Pointer-Events, nicht mit Scroll konkurrieren lassen.
- Skeleton/Shimmer nur, wo Streaming nicht greift.
