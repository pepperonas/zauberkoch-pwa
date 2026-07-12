---
paths:
  - "frontend/**"
description: Frontend-Regeln (React 19, M3 Expressive handgebaut, TS strict)
---

# Frontend-Regeln

- **TypeScript strict** — kein `any`, keine `@ts-ignore` ohne Begründung im Code.
- **M3 Expressive handgebaut**: Farben/Shapes/Typo NUR über CSS Custom Properties aus `src/styles/tokens.css`. Kein MUI/Ant/Bootstrap. Neue Komponenten nutzen bestehende Token, erfinden keine Hex-Werte inline.
- **Zwei Farbschemata** (Kochen=Basilikum-Grün, Cocktail=Violett) × Light/Dark — Umschaltung ausschließlich über Token-Werte (`data-mode`/`data-theme` am Root), damit Morphs animierbar bleiben.
- **UI-Strings NUR über `src/i18n/de.ts`** (`t('key')`) — kein hartcodierter Text in Komponenten, auch keine aria-Labels.
- **Server-State über TanStack Query**, kein eigener Fetch-Cache. Auth-Status via `/api/v1/me`; niemals Tokens in localStorage.
- SSE-Konsum über den zentralen Hook (`useRecipeStream`) — Events sind semantisch (`meta`/`zutat`/`schritt`/`tipp`/`done`/`error`).
- Nutzer-/KI-Content nie via `dangerouslySetInnerHTML` rendern.
- Touch-Targets ≥ 48 px; interaktive Elemente mit sichtbarem `:focus-visible`.
- PWA: bei App-Shell-Änderungen SW-Cache `zauberkoch-vN` bumpen + in CLAUDE.md nachführen.
