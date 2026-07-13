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
- **Interne Navigation:** animierte Routen (Karte→Detail, Tabs, Zurück) IMMER über `useViewTx().go(to, {sharedId?})` (`src/state/viewTransition.tsx`), nicht über rohes `navigate()`/`<a href>` (rohe Links machen Full-Reload + killen laufende Generierungen; rohes `navigate` überspringt die View-Transition). Details + die vier Morph-Fallstricke: `motion.md`. `RecipeDetailPage` ist `lazy`, wird aber off-route vorgewärmt und MUSS ohne Route-Params renderbar bleiben.
- **Tooltips:** ergänzende Erklärungen an Buttons via `<Tooltip text={t('tips.…')}>` (`components/ui/Tooltip.tsx`) — reines CSS, nur Desktop (`hover:hover and pointer:fine`), `role="tooltip"`, Texte in `de.ts` unter `tips`.
- **Kein horizontaler Scroll:** `html, body { overflow-x: clip }` (base.css); Header schrumpffähig halten.
- SSE-Konsum über den zentralen Hook (`useRecipeStream`) — Events sind semantisch (`meta`/`zutat`/`schritt`/`tipp`/`done`/`error`).
- Nutzer-/KI-Content nie via `dangerouslySetInnerHTML` rendern.
- Touch-Targets ≥ 48 px; interaktive Elemente mit sichtbarem `:focus-visible`.
- PWA: bei App-Shell-Änderungen SW-Cache `zauberkoch-vN` bumpen + in CLAUDE.md nachführen.
- **Icons in der UI** nur über `<Icon name="…" />` (`src/components/icons/`) — keine Emojis in Komponenten/Strings (Ausnahme: Kessel-Animation). Neuer Glyph = `glyphs.tsx` + `icons.test.ts`.
- **Brand-Assets** (Favicon/PWA/OG in `public/`) sind generiert, nicht handgepflegt: `npm run gen:assets` (`scripts/generate-assets.mjs`). Theme-/Farbänderung = `COLORS` im Script anpassen + neu generieren + committen; OG bei Änderung versionieren (`og-vN.png`).
