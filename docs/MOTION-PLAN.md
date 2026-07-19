# Motion-Plan — Audit & Priorisierung (2026-07-19)

## 1. Motion-System (Ist)

- **Library:** Motion (`motion/react`, framer-motion-Nachfolger) für alle Springs; **native View Transitions API** (react-router Data-Router, built-in) für Route-/Shared-Element-Morphs; CSS nur für VT-Pseudo-Regeln (`styles/base.css`) und Sonderfälle (Theme-Reveal per JS-WAAPI, CRT-Logout).
- **Tokens:** `src/motion/tokens.ts` = Single Source (MD3-Expressive: `fastSpatial`/`defaultSpatial`/`slowSpatial` mit `bounce`-Overshoot, `effectsFast`/`effectsDefault` ohne, `staggerIn`, `reducedFade`, benannte Presets `heroEnter`/`rewardPop`/`dismissDip`). `src/motion/springs.ts` = älterer, weiter gültiger Satz (`spring`/`springBouncy`/`springSnappy`/`springSoft`, `riseIn`/`popIn`, `pressScale`).
- **Shared-Element:** KEIN `layoutId`-Container-Transform mehr — Karte→Detail läuft über die View Transitions API (`useViewTransitionState`, feste Namen `zk-shared-motif`/`zk-shared-title`); `layoutId` nur noch für Indikatoren (Nav-Pille, Segmented-Thumb). AnimatePresence für Overlays/Listen-Exits.
- **⚠️ Back-Button-Pfad (bekannter Bug-Bereich, 2026-07-15 gefixt):** Browser-Back morpht über react-routers synchrones VT-Rendering. Nichts in diesem Plan berührt VT-Naming, Route-Struktur oder die framer-Entrance-Suppression (`morphing`/`isShared`) — alle neuen Animationen liegen INNERHALB von Seiten (Fehler-/Empty-States, Zahlen, Button-Icons), nie auf Route-Wechseln. Regeln: `.claude/rules/motion.md`.

## 2. Bestandsaufnahme (bereits vorhanden — nicht neu erfinden)

| Moment | Umsetzung |
|---|---|
| Karte→Detail Container Transform (inkl. Browser-Back) | VT, `RecipeCard`/`RecipeView` + `base.css` |
| Nav-/Segmented-Indikator morpht | `layoutId` Pille/Thumb (`App.tsx`, `ui/index.tsx`) |
| Favorit-Reward (Pop + Partikel-Burst, optimistisch) | `FavoriteButton.tsx` + `rewardPop` |
| Chip-Select mit Overshoot, Button/IconButton Press-Scale | `ui/index.tsx` |
| Gebrandeter KI-Loader (Kessel/Shaker, 320px, Zutaten-Drops) | `ConjureStage.tsx` |
| Streaming: gestaffelte Content-Blöcke, Titel-Wort-Reveal | `RecipeView`/`GeneratePage` + `staggerIn` |
| Abschluss-Belohnung: Settle-Pop + Glow-Sweep + Haptik + SparkBurst | `GeneratePage` Hero-Moment |
| Portionen-Digit-Roll | `NumberTicker.tsx` |
| Einkaufslisten-Check (elastischer Tick + Strike-Sweep), Drag-Reorder | `ShoppingPage` |
| Bottom Sheet Drag + Velocity-Snap, FAB→Dialog-Morph | `ui/Sheet.tsx` u. a. |
| Theme-Circular-Reveal, Modus-Farbmorph, CRT-Logout | `state/app.tsx`, `CrtOff.tsx` |
| Karten-Entrance gestaffelt (Listen) | `RecipeCard` `riseIn` + `stagger` |

## 3. Lücken → priorisierte Vorschläge (sortiert nach Wirkung ÷ Aufwand)

| # | Moment | Ist-Zustand | Vorgeschlagene Animation | M3-Pattern | Wirkung | Aufwand | Dateien |
|---|---|---|---|---|---|---|---|
| 1 | **Generierung fehlgeschlagen** | Karte erscheint hart, null Motion — ausgerechnet der emotional heikelste Moment | Sanfter Shake-in (transform-only Keyframes, spatial) + Fade; nie schroff | Error-State: „sanftes Schütteln + Farbe" | hoch | klein | `motion/tokens.ts`, `GeneratePage.tsx` |
| 2 | **Empty/Loading-States** (Favoriten, Verlauf, Einkauf) | nackte `<p class="muted">`, harter Wechsel Loading→leer→gefüllt | Weicher Cross-Morph via AnimatePresence + Icon-Pop; eine wiederverwendbare `StateNote`-Komponente | Empty→gefüllt als Cross-Morph | mittel-hoch | klein | neu `ui/StateNote.tsx`, 3 Pages |
| 3 | **Nährwerte** | Zahlen poppen mit der Sektion statisch rein | Count-up beim ersten Sichtbarwerden (Motion `animate()`, tabular-nums) | Zähler-Count-up | mittel | klein | neu `recipe/CountUp.tsx`, `RecipeView.tsx` |
| 4 | **„Überrasch mich"** | gewöhnlicher outlined Button | Verspielter Geschenk-Wiggle (Icon-Rotate-Keyframes, spatial) beim Press, parallel zum Start | Playful Shuffle, ein fokaler Effekt | mittel | klein | `motion/tokens.ts`, `GeneratePage.tsx` |
| 5 | Tageslimit-Box | statisch | Settle-Pop des Snooze-Icons (heroEnter-Wiederverwendung) | Entrance | klein | klein | `GeneratePage.tsx` |

**Bewusst NICHT umgesetzt (Zurückhaltung / Risiko):**
- *Parallax-Hero im Detail:* kollidiert mit dem VT-Snapshot des Shared-Motifs (Back-Button-Pfad!) — Risiko ≫ Nutzen.
- *Pull-to-Refresh / Rubber-Band:* konkurriert mit nativem Scroll/PWA-Overscroll, Datenmodell braucht kein manuelles Refresh.
- *Liquid-Fill im Cocktail-Detail:* das Glas-Motiv ist Shared-Element — eine laufende Animation darauf würgt den Morph ab (dokumentierter Morph-Killer).
- *Extra-Belohnung „erste Generierung des Tages":* der Hero-Moment (Sweep+Burst+Haptik) feiert bereits jeden Abschluss; ein zweiter Layer wäre Effekthascherei.
- *Skeleton→Content-Morph:* es gibt bewusst keine Skeletons — das Streaming baut echten Content auf (stärker als jedes Skeleton).
- *Chips-Layout-Animation beim Filtern:* Listen-Reflow via `layout` auf Karten kollidiert mit der VT-Entrance-Suppression (`morphing`) — Back-Bug-Gefahr.

## 4. Umsetzungsreihenfolge

Ein Commit pro Moment, in Tabellen-Reihenfolge (1→5). Neue Presets ausschließlich in `motion/tokens.ts` (benannt), `prefers-reduced-motion` → `reducedFade`/statisch, nur `transform`/`opacity`.
