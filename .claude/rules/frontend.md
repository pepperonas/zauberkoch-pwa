---
paths:
  - "src/**"
  - "public/**"
  - "index.html"
description: Frontend-Regeln (PWA, MD3 Expressive, Vanilla JS)
---

# Frontend-Regeln

- **Material Design 3 Expressive**: Design-Tokens aus `/Users/martin/claude/_md3-expressive/md3-expressive.css` als Referenz; tonale Surfaces, XL-Corners (28 px), vollrunde Buttons, MD3-Switches/-Slider.
- **`prefers-reduced-motion`-Guard ist auf JEDER Animation Pflicht** (Media-Query-Guard oder JS-Check) — keine Ausnahme.
- **Vanilla JS, ES-Module** — kein React/Vue/Framework im Frontend. Vite ist nur Build-Tool.
- **Service Worker**: versionierter Cache `zauberkoch-vN`. Bei JEDER Änderung an App-Shell-Dateien (index.html, src/*, CSS) die Cache-Version in `public/sw.js` bumpen UND die aktuelle Version in `CLAUDE.md` nachführen. HTML-Shell network-first cachen (Lehre aus yamaha-controller: cache-first ohne Invalidierung erreicht installierte PWAs nie).
- **UI-Texte Deutsch**, Code/Kommentare Englisch.
- **Keine externen Requests** zu CDNs/Fonts — Assets selbst bundlen.
- Responsive: Touch-Targets ≥ 40 px, `env(safe-area-inset-*)` für PWA-Installs beachten.
- Nutzer-Content immer HTML-escapen, bevor er ins DOM geht.
