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
  app/api/v1/     # Router (auth, recipes, favorites, shopping, me, health)
  app/core/       # config (pydantic-settings), security, logging
  app/models/     # SQLAlchemy: users, sessions, recipes, favorites,
                  #   shopping_list_items, generation_cache, allowlist, rate_limits
  app/schemas/    # Pydantic (u.a. Recipe — das Rezept-JSON-Schema)
  app/services/   # ai (Anthropic-Streaming + inkrementeller JSON-Parser),
                  #   cache, ratelimit, aggregation (Einkaufsliste)
  app/prompts/    # Rezept-System-Prompts, VERSIONIERT (recipe_v1.py, …) — Kernstück!
  alembic/        # Migrationen (von Anfang an; nie Schema ohne Migration ändern)
  scripts/        # Admin-CLI: python -m scripts.allowlist add <email>
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
- **Security**: `ANTHROPIC_API_KEY` nur server-seitig. Auth-Tokens NIE in localStorage (httpOnly-Cookies). CSRF-Schutz auf state-changing Requests. Scoring/Limits/Validierung server-seitig. CORS strikt auf zauberkoch.de.
- **Rate-Limits**: `DAILY_LIMIT_PER_USER` (20) + `DAILY_LIMIT_GLOBAL` (Kostenschutz), beide env; 429 mit klarem UI-Feedback.
- **Rezept-System-Prompt** ist ein iterierbares Kernstück: Versionen in `app/prompts/`, Prompt-Version wird am Rezept gespeichert. Keine generischen Rezepte; metrische Mengen; Cocktails mit cl + Technik (shaken/stirred/built).
- **Keine KI-Bilder** — kuratierte SVG-Motive pro Länderküche.
- **PWA**: Service Worker mit versioniertem Cache `zauberkoch-vN` (aktuell **v3**) — bei jedem App-Shell-Change bumpen und Version hier nachführen. Favoriten offline lesbar.
- **CSP beachtet**: `script-src 'self'` — KEINE Inline-Scripts in index.html (Theme-Init liegt extern in `public/theme-init.js`).
- **Tests vor Deploy**: `pytest` + `npm test` müssen grün sein; `deploy.sh` erzwingt das.
- Touch-Targets ≥ 48 px, Lighthouse Accessibility ≥ 95. Footer überall: `© 2026 Martin Pfeffer | celox.io`.

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
