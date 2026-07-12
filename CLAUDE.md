# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt: Zauberkoch 🧑‍🍳🍸 — KI-Rezept- & Cocktail-Generator

Mobile-first Web-App unter **https://zauberkoch.de**: Nutzer wählt Modus (Kochen/Cocktail), Länderküche, Geschmacksrichtungen und Constraints in einem 3-Schritt-Wizard — die Claude-API generiert ein vollständiges Rezept, das sich **live per SSE-Streaming aufbaut** (Titel → Zutaten → Schritte). Repo: `pepperonas/zauberkoch-pwa` (privat). Geschlossene Beta: `OPEN_SIGNUP=false` + Allowlist.

## Tech-Stack

| Layer | Technologie |
|---|---|
| Backend | Python 3.12, FastAPI, SQLite (WAL), SQLAlchemy 2, Pydantic v2, Alembic |
| KI | Anthropic API, Modell via env `ANTHROPIC_MODEL` (Default `claude-sonnet-5`), Streaming → semantische SSE-Events |
| Frontend | React 19, Vite, TypeScript strict, TanStack Query |
| Styling | Material 3 Expressive — **handgebaut** (Design-Tokens als CSS Custom Properties, KEIN MUI/Ant) |
| Animation | Motion (framer-motion-Nachfolger), echte Spring-Physik |
| Auth | Google OAuth 2.0 (Auth Code + PKCE, server-seitig), Sessions als httpOnly-Cookies, CSRF-Schutz |
| Deployment | VPS 69.62.121.168: systemd `zauberkoch-api` (Port **8742** loopback) + statischer Build in `/var/www/zauberkoch.de/`, vHost im zentralen nginx, certbot. **KEIN Docker.** |

## Struktur

```
backend/          # FastAPI-App (eigenes venv: backend/.venv)
  app/api/v1/     # Router (auth, recipes, favorites, shopping, share, me, health)
  app/core/       # config (pydantic-settings), security, logging
  app/models/     # SQLAlchemy: users, sessions, recipes, favorites,
                  #   shopping_list_items, generation_cache, allowlist, rate_limits
  app/schemas/    # Pydantic (u.a. Recipe — das Rezept-JSON-Schema)
  app/services/   # ai (Anthropic-Streaming + inkrementeller JSON-Parser),
                  #   cache, ratelimit, aggregation (Einkaufsliste)
  app/prompts/    # Rezept-System-Prompts, VERSIONIERT (recipe_v1.py, …) — Kernstück!
  alembic/        # Migrationen (von Anfang an; nie Schema ohne Migration ändern)
  scripts/        # Admin-CLIs: allowlist, stats, smoke_ai, showcase
  tests/          # pytest (Temp-DB, keine echten API-Calls)
frontend/         # React-App
  src/styles/     # tokens.css (M3-Schemata: Safran-Orange=Kochen, Violett=Cocktail, je Light+Dark)
  src/i18n/       # de.ts + t() — ALLE UI-Strings hier, nie hartcodiert in Komponenten
  src/motion/     # Spring-Presets/Transitions
  src/features/   # wizard, recipe, cook-mode, favorites, shopping, auth, landing
deploy/           # zauberkoch-api.service, nginx-vhost.conf, deploy.sh, backup-timer
docs/             # DEPLOY.md (Erst-Einrichtung), GOOGLE-OAUTH.md
```

## Befehle

```bash
# Backend (aus backend/)
source .venv/bin/activate
uvicorn app.main:app --reload --port 8742     # Dev-Server
alembic upgrade head                          # Migrationen
pytest                                        # Tests — Pflicht vor Deploy
python -m scripts.allowlist add <email>       # Allowlist verwalten
python -m scripts.stats [tage]                # Usage/Kosten/Cache-Quote/Feedback-Report
python -m scripts.smoke_ai [cocktail]         # 1 echte Generierung (Prompt/Parser-Smoke, kostet Tokens)
python -m scripts.showcase                    # Landing-Galerie seeden (idempotent, auf dem VPS)

# Frontend (aus frontend/)
npm run dev          # Vite-Dev-Server (Proxy /api → localhost:8742)
npm run build        # Production-Build
npm test             # Vitest — Pflicht vor Deploy
npx playwright test  # E2E-Smoke (lokal)

# Deploy (vom Mac)
./deploy/deploy.sh              # Tests → Build → rsync → restart → healthcheck
```

## Konventionen (verbindlich)

- **UI-Texte Deutsch**, Code/Kommentare/Commits Englisch. Strings NUR über `src/i18n/de.ts` (i18n-ready).
- **M3 Expressive handgebaut**: alle Farben/Shapes/Typo über Tokens in `tokens.css`. Moduswechsel Kochen↔Cocktail = Token-Morph (animiert), kein Neu-Rendern.
- **Motion**: echte Springs (stiffness/damping) via Motion-Library — **keine linearen `ease-in-out`-CSS-Transitions als Animations-Ersatz**. Nur `transform`/`opacity` animieren, `will-change` gezielt. `prefers-reduced-motion` → schnelle Fades, Pflicht auf jeder Animation.
- **API-Contract**: anonymes `GET /me` antwortet `200 {authenticated:false}` (nie 401 — Konsolenfehler/Lighthouse). 
- **Security**: `ANTHROPIC_API_KEY` nur server-seitig. Auth-Tokens NIE in localStorage (httpOnly-Cookies). CSRF-Schutz auf state-changing Requests. Scoring/Limits/Validierung server-seitig. CORS strikt auf zauberkoch.de.
- **Rate-Limits**: `DAILY_LIMIT_PER_USER` (20) + `DAILY_LIMIT_GLOBAL` (Kostenschutz), beide env; 429 mit klarem UI-Feedback.
- **Cache-Semantik (2026-07-12)**: Der Generation-Cache bedient nur **Erst-Anfragen** (andere Nutzer, Fehler-Retry). Wiederholt derselbe Nutzer identische Parameter, hat er das Rezept schon → Server schaltet automatisch auf `regenerate` und liefert ein **neues** Rezept. Zwei Verfeinerungen: (a) **`personen` ist aus dem Cache-Key ausgenommen** — nur-Personen-Änderung wird gratis aus dem Cache bedient und server-seitig skaliert (`_scale_recipe`); (b) Variationen bekommen die **Avoid-Liste** der bereits erhaltenen Titel (`vermeiden_titel`, server-injected, Client-Werte werden verworfen) → **Prompt v4** verhindert Beinahe-Duplikate; System-Block identisch zu v3 (Anthropic-Prompt-Cache trifft weiter).
- **Modellwahl geprüft (2026-07-11)**: `claude-sonnet-5` ist der Sweet Spot (~3–4 ct/Rezept live; Haiku spart nur ~2 ct bei sichtbarem Qualitätsverlust, Opus per `ANTHROPIC_MODEL`-Env A/B-testbar, falls Feedback-Daten es nahelegen). ⚠️ Kosten-Konstanten `PRICE_*` in `app/api/v1/admin.py` + `scripts/stats.py` = Sonnet-5-**Intro-Preise** ($2/$10) — **ab 2026-09-01 auf $3/$15 anheben**, sonst zeigt das Dashboard ~33 % zu wenig.
- **Rezept-System-Prompt** ist ein iterierbares Kernstück: Versionen in `app/prompts/`, Prompt-Version wird am Rezept gespeichert. Keine generischen Rezepte; metrische Mengen; Cocktails mit cl + Technik (shaken/stirred/built).
- **Keine KI-Bilder** — kuratierte SVG-Motive pro Länderküche.
- **PWA**: Service Worker mit versioniertem Cache `zauberkoch-vN` (aktuell **v17**) — bei jedem App-Shell-Change bumpen und Version hier nachführen. Favoriten offline lesbar.
- **Karten-Motive**: Flache Vektor-Illustrationen pro Gericht-/Glas-Typ in `RecipeMotif.tsx` (22 Motive: 8 Glas-Typen highball/tumbler/coupe/tiki/martini/wine/flute/mule + 14 Gericht-Typen pasta/bowl/suppe/pfanne/pizza/salat/burger/fisch/steak/dessert/taco/auflauf/pancakes/sandwich; Matcher `motifForRecipe`, Cocktails matchen über das `glas`-Feld der Listen-API). Neue Motive IMMER über den Skill `.claude/skills/recipe-motifs/` erzeugen (Stil-Spezifikation + Generator-Prompt) — keine KI-Rasterbilder.
- **Dauer-Formatierung** immer über `strings.units.duration(min)` (de.ts): Min. → h → Tage („3 Tage" statt „4320 Min."). **Küchen-Chips personalisierbar**: `preferences.kuechen` (Backend-Preferences, max 40, leer = App-Defaults), Editor = `CuisineSheet` (✏️-Chip im Wizard-Schritt 1, ~110er-Katalog in `strings.cuisineRegions`, Suche + Custom-Einträge).
- **Vorräte**: `preferences.vorraete` (Pflege im Profil-Sheet) erscheinen im Wizard-Kühlschrank-Schritt als **vorausgewählte Chips** (Tap = für diesen Lauf abwählen); keine eigene Nav-Rubrik. **Einkaufsliste hat zwei Ansichten** (Segmented, `zk-shopping-view` in localStorage): „Liste" = aggregierte Abhak-Liste, „Nach Gericht" = filterbare Rezeptliste mit aufklappbaren Zutaten + „Zutaten zur Liste" — bewusst OHNE Häkchen-Sync zwischen den Ansichten (Aggregation verschmilzt Mengen).
- **Interne Navigation NUR über Router-`Link`/`NavLink`** — ein echtes `<a href>` (wie früher das Header-Logo) macht einen Full-Reload und killt die laufende Generierung. Hintergrund-Indikatoren: `GenerationBar` (Balken unter dem Header) + `GenerationPill` (beide in `GenerationPill.tsx`, lazy).
- **SEO/OG**: `index.html` trägt die Root-Meta (Description, Canonical, OG/Twitter mit statischem `/og.png`, JSON-LD WebApplication) in einem Sentinel-Block `<!-- zk:root-meta:start/end -->` — `share.py` strippt ihn auf `/r/{token}`-Seiten und ersetzt auch den `<title>` (sonst lesen Crawler die Root-Tags statt der Rezept-Tags). Das Thumbnail `frontend/public/og.png` (1200×630) wird aus der Design-Quelle `docs/og-root.html` via Headless-Chromium-Screenshot (1200×630) gerendert — bei Änderungen dort neu rendern.
- **Kein horizontaler Scroll**: `html, body { overflow-x: clip }` (base.css) + Header ist schrumpffähig (Logo-Ellipsis, enge `.shell__actions`-Gaps < 430 px). Theme-Wechsel = **Circular Reveal** über die View Transitions API (`toggleTheme(origin)` in state/app.tsx, Keyframes `zk-theme-reveal` in base.css, Fallback = Token-Morph); Moduswechsel bleibt Token-Morph.
- **Generierung ist navigationsfest**: Der SSE-Stream lebt im globalen Store `src/state/generation.ts` (außerhalb React, `useSyncExternalStore`) — NIE in Komponenten-State zurückverlagern oder beim Unmount aborten. Streaming-UX = `ConjureStage` (magischer Kessel/Shaker, event-getriebene Phasen) + globale `GenerationPill` (schwebt über der Nav, führt zur laufenden/fertigen Generierung zurück).
- **CSP beachtet**: `script-src 'self'` — KEINE Inline-Scripts in index.html (Theme-Init liegt extern in `public/theme-init.js`).
- **Tests vor Deploy**: `pytest` + `npm test` müssen grün sein; `deploy.sh` erzwingt das.
- Touch-Targets ≥ 48 px. Lighthouse-Stand (Prod, 2026-07-11): **99/100/100/100** — bei UI-Änderungen nicht darunter fallen (CLS-Falle: Footer/Lazy-Content, siehe App.css `min-height`). Footer überall: `© 2026 Martin Pfeffer | celox.io`.

## Env-Variablen

Alle in `.env.example` dokumentiert. Secrets lokal in `backend/.env`, auf dem VPS in `/opt/zauberkoch-api/.env` (mode 640) — nie committen. Google-OAuth = **eigener Client** für Zauberkoch (Redirect-URIs registriert, docs/GOOGLE-OAUTH.md).

## Deploy-Kurzform (Details: docs/DEPLOY.md)

```bash
./deploy/deploy.sh                    # kompletter Deploy
ssh root@69.62.121.168 'systemctl status zauberkoch-api'
ssh root@69.62.121.168 'journalctl -u zauberkoch-api -f'
```

nginx-vHost: `/` → `/var/www/zauberkoch.de/` (SPA-Fallback), `/api/` → 127.0.0.1:8742, **SSE-Endpoint mit `proxy_buffering off`** + langen Timeouts. `www` → 301 Apex. Backup: `zauberkoch-backup.timer` nächtlich → `/var/backups/zauberkoch/`. Infrastruktur-Gesamtdoku: `/Users/martin/CLAUDE.md`.

## KI-Framework-Pflege

Dieses Repo folgt der vollen Claude-Code-Struktur. Bei jeder relevanten Änderung prüfen, ob Updates nötig sind: `CLAUDE.md` (Stack/Befehle/SW-Cache-Version), `.claude/rules/*` (Globs & Regeln), `.claude/skills/*` (Deploy-/Release-Checklisten), `.env.example` (neue Variablen), `docs/*`.
