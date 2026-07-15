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

## Route-/View-Transitions (react-router Data-Router, built-in VT — 2026-07-15)

**Grundlegend umgestellt vom hand-gerollten `ViewTransitionProvider` auf react-routers EINGEBAUTE View Transitions** (`createBrowserRouter` + `<RouterProvider>` in `App.tsx`/`main.tsx`). Grund: der Browser-/System-Zurück-Button morphte auf echtem Mobile-Chrome NIE — die manuelle Variante konnte den externen Traverse nicht mit dem VT-Snapshot synchronisieren (Timing flaky). **react-router besitzt jetzt die History und rendert die neue Route SYNCHRON im VT-Callback** (`startViewTransition(() => flushSync(render))`) — für PUSH **und** POP (Browser-Back!). Damit morpht Browser-Back verifiziert auf **fine UND coarse** (Pixel-5, WebKit).

- **Router:** `export const router = createBrowserRouter([{ element:<Shell/>, children:[…public…, { element:<RequireAuth/>, children:[…gated…] }] }])`. `Shell` = Layout mit `<Outlet/>` (in Suspense, Fallback `page-tx__spacer`) + Header/Nav/Footer + `<ScrollRestoration/>`. `RequireAuth` = `me ? <Outlet/> : <LandingPage/>` (public `/r/:token`+legal liegen AUSSERHALB → immer sichtbar). Provider (`AppProvider`/`SnackbarProvider`, kein Router-Hook) wrappen `RouterProvider`.
- **JEDE Navigation trägt `viewTransition`:** `<Link/NavLink viewTransition>` (Nav-Tabs, Header-Logo, Footer-Legal), `navigate(to, {viewTransition:true})` (RecipeCard→Detail). **Browser-Back UND In-App-„← Zurück" = `navigate(-1)`** (POP) → react-router re-applied die aufgezeichnete VT automatisch (kein Sonderpfad, kein Navigation-API-Listener mehr).
- **Shared-Element-Naming über `useViewTransitionState('/rezept/<id>')`** (nicht mehr `activeId`): true, solange eine VT **zu ODER von** dieser Route läuft → Karte + Detail-Hero paaren sich für vorwärts UND zurück. `RecipeCard`: `isSource = useViewTransitionState('/rezept/'+id)` (benennt Motiv+Titel); Entrance-Suppression `morphing = isSource || useViewTransitionState(location.pathname)` (Listen-Pfad ist „transitioning" bei beiden Richtungen → keine `riseIn`-Karten mit opacity 0 im New-Snapshot). `RecipeView`: `isShared = sharedId!=null && useViewTransitionState('/rezept/'+sharedId)`.
- **CSS unverändert in `styles/base.css`** (die Namen `zk-shared-motif/title`, `zk-d-ing/steps/act`, `zk-nav/zk-header`-Hold, Root-Crossfade, MD3-Easing gelten für react-routers VT genauso — es ist dieselbe `::view-transition`-Pseudo-Ebene). Header mobil opak via `@media (pointer:coarse)` (der alte `zk-route-vt`-Klassen-Toggle entfiel mit dem Provider — dead CSS). Theme-Toggle bleibt sein eigenes System (`zk-theme-vt`, s. o.).
- **Scroll:** react-routers `<ScrollRestoration/>` (POP restauriert, PUSH resettet) — verifiziert.
- **Kosten:** Entry-Chunk +~15 kB gz (Data-Router-Runtime). Bewusst akzeptiert für den zuverlässigen Browser-Back-Morph.

**Diese Morph-Killer gelten weiter (jeweils hart erarbeitet):**
1. **Ziel-Seite muss synchron mit Hero rendern:** `RecipeDetailPage` ist `lazy`, wird per verstecktem Off-Route-Mount in `Shell` vorgewärmt (`{me && !'/rezept/' && <div hidden><Suspense><RecipeDetailPage/></Suspense></div>}`) → `React.lazy` vor der Navigation resolved. NICHT eager importieren (Lighthouse). Muss ohne Route-Params renderbar bleiben.
2. **Detail-Query VOR der Navigation cachen:** `RecipeCard` `ensureQueryData` in `open()` + `onPointerDown`-Prefetch.
3. **framer-Entrance bei aktivem Morph unterdrücken:** `RecipeView`-Hero bei `isShared`, `RecipeCard`-`riseIn` bei `morphing` — sonst steht das Ziel im New-Snapshot auf opacity 0.
4. **NIE zurück zum manuellen `startViewTransition`/`go()`/Navigation-API-Listener** — der ganze Grund der Migration war, dass genau das Browser-Back auf Mobile nicht synchronisieren konnte.

`prefers-reduced-motion` / kein `startViewTransition` → react-router navigiert normal ohne VT. **⚠️ „Title-Bar flackert auf Mobile" = Browser-Adressleiste** (in Chromium+WebKit/iPhone nicht reproduzierbar; Header ist mobil opak) → nur via PWA-Install weg.
