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
- **Interne Navigation (react-router Data-Router, `createBrowserRouter`):** animierte Routen laufen über react-routers **eingebaute** View Transitions — JEDE Navigation trägt `viewTransition`: `<Link/NavLink viewTransition>` (Tabs, Header-Logo, Footer) bzw. `navigate(to, {viewTransition:true})` (RecipeCard→Detail), Zurück (Browser **und** In-App) = `navigate(-1)`. **Nie ein echtes `<a href>`** (Full-Reload → killt laufende Generierungen). Shared-Naming via `useViewTransitionState('/rezept/<id>')`. Der alte `useViewTx().go()`/`ViewTransitionProvider` ist ENTFERNT (`viewTransition.tsx` hält nur noch die Namens-Konstanten). Details + Morph-Fallstricke: `motion.md`. `RecipeDetailPage` ist `lazy`, wird aber off-route in `Shell` vorgewärmt und MUSS ohne Route-Params renderbar bleiben.
- **Tooltips:** ergänzende Erklärungen an Buttons via `<Tooltip text={t('tips.…')}>` (`components/ui/Tooltip.tsx`) — reines CSS, nur Desktop (`hover:hover and pointer:fine`), `role="tooltip"`, Texte in `de.ts` unter `tips`.
- **Kein horizontaler Scroll:** `html, body { overflow-x: clip }` (base.css); Header schrumpffähig halten.
- **Drag-Reorder auf Touch NUR über Griff:** framer-`Reorder.Item` mit `dragListener={false}` + `useDragControls` (pro Item = eigene Kindkomponente); der Griff hat `touch-action:none` + `controls.start(e)`, die Zeile `touch-action:pan-y` — sonst schluckt das ziehbare Item das vertikale Scrollen (siehe `ShoppingRow` in `ShoppingPage.tsx`).
- SSE-Konsum über den zentralen Hook (`useRecipeStream`) — Events sind semantisch (`meta`/`zutat`/`schritt`/`tipp`/`done`/`error`).
- Nutzer-/KI-Content nie via `dangerouslySetInnerHTML` rendern.
- Touch-Targets ≥ 48 px; interaktive Elemente mit sichtbarem `:focus-visible`.
- PWA: bei App-Shell-Änderungen SW-Cache `zauberkoch-vN` bumpen + in CLAUDE.md nachführen.
- **Icons in der UI** nur über `<Icon name="…" />` (`src/components/icons/`) — keine Emojis in Komponenten/Strings (Ausnahme: Kessel-Animation). Neuer Glyph = `glyphs.tsx` + `icons.test.ts`.
- **Brand-Assets** (Favicon/PWA/OG in `public/`) sind generiert, nicht handgepflegt: `npm run gen:assets` (`scripts/generate-assets.mjs`). Theme-/Farbänderung = `COLORS` im Script anpassen + neu generieren + committen; OG bei Änderung versionieren (`og-vN.png`).
