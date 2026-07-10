---
paths:
  - "frontend/src/**"
description: Motion-Regeln (M3 Expressive Motion, Spring-Physik)
---

# Motion-Regeln

- **Alle Animationen mit echter Spring-Physik** (Motion-Library, stiffness/damping) — keine linearen `ease-in-out`-CSS-Transitions als Animations-Ersatz. Gemeinsame Presets in `src/motion/springs.ts` verwenden/erweitern, keine Ad-hoc-Werte streuen.
- **Nur `transform` und `opacity` animieren** (60 fps auf Mittelklasse-Android). `will-change` gezielt und temporär, nie global. Keine Layout-Properties (width/height/top) animieren — Container-Transform über Scale/Clip lösen.
- **`prefers-reduced-motion` ist Pflicht auf jeder Animation**: Springs → schnelle Fades (zentraler Guard in `src/motion/`, nicht pro Komponente improvisieren).
- Signatur-Patterns des Projekts: Shared-Element Karte→Detail (Container Transform), Chip-Select mit Overshoot, gestaffelte Streaming-Entrances (stagger), Digit-Roll im Portionen-Stepper, Bottom Sheet mit Drag + Velocity-Snap, elastischer Check + Strike-Sweep, FAB→Dialog-Morph, Theme-/Modus-Farbmorph.
- Gesten: Velocity entscheidet über Snap/Zurückfedern; Drag immer mit Pointer-Events, nicht mit Scroll konkurrieren lassen.
- Skeleton/Shimmer nur, wo Streaming nicht greift.
