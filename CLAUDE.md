# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt: Zauberkoch 🧑‍🍳

**Rezept-/Koch-Web-App als PWA.** Vanilla JS + Vite Frontend (Material Design 3 Expressive), Express + better-sqlite3 Backend. Öffentliches Deployment auf dem VPS unter `zauberkoch.celox.io` (nginx + systemd `zauberkoch-api`). Repo: `pepperonas/zauberkoch-pwa` (privat). **Nicht verwechseln:** `pepperonas/zauberkoch` (ohne `-pwa`) ist die alte, eigenständige Spring-Boot/Vaadin-App (Stand Sep 2025) — bleibt unangetastet und ist NICHT dieses Projekt.

**Status:** Projekt-Gerüst steht (Framework-Struktur, noch kein App-Code). Beim Anlegen von App-Code diese Datei aktualisieren — sie ist die einzige Quelle für Build-/Test-/Deploy-Wissen dieses Projekts.

## Architektur (Soll-Zustand)

```
zauberkoch/
├── index.html          # App-Shell (Vite-Entry)
├── src/                # Frontend-Module (Vanilla JS, ES-Module)
├── public/             # Statische Assets, manifest.webmanifest, sw.js
├── server/             # Express-Backend (eigenes package.json, eigene Tests)
│   ├── server.js       # Entry, Port 4251 (loopback, nginx-Proxy /api/)
│   ├── db.js           # better-sqlite3, Daten in server/data/ (gitignored)
│   └── tests/
├── tests/              # Frontend-/Unit-Tests (node --test bzw. vitest)
└── docs/               # Ergänzende Doku (Deploy-Details, API-Vertrag)
```

- **Scoring/Logik mit Sicherheitsrelevanz nur server-seitig** (Muster wie xword/audit-platform).
- Secrets ausschließlich in `/opt/zauberkoch-api/.env` auf dem VPS (mode 640) bzw. lokal in `server/.env` — nie committen.

## Konventionen

- **UI:** Material Design 3 Expressive. Token-Referenz: `/Users/martin/claude/_md3-expressive/md3-expressive.css`. `prefers-reduced-motion`-Guard ist auf jeder Animation Pflicht.
- **Sprache:** UI-Texte und READMEs Deutsch, Code/Kommentare/Commits Englisch.
- **PWA:** Service-Worker mit versioniertem Cache `zauberkoch-vN` — **bei jedem App-Shell-Change die Version bumpen** (aktuelle Version hier in CLAUDE.md nachführen).
- **Kein Framework-Ballast:** Vanilla JS, keine React/Vue-Dependencies im Frontend.

## Befehle

```bash
npm run dev        # Vite-Dev-Server (Frontend) — Proxy auf server/ per vite.config
npm run build      # Production-Build nach dist/
npm test           # Frontend-/Unit-Tests
cd server && npm test   # Backend-Tests — Pflicht vor jedem Backend-Deploy
```

## Deploy (VPS 69.62.121.168)

```bash
# Frontend: build + rsync (vorher npm test!)
npm test && npm run build
rsync -avz --delete dist/ root@69.62.121.168:/var/www/zauberkoch.celox.io/

# Backend: sync + deps + restart (vorher cd server && npm test!)
rsync -avz --exclude node_modules --exclude data --exclude .env \
  server/ root@69.62.121.168:/opt/zauberkoch-api/
ssh root@69.62.121.168 'cd /opt/zauberkoch-api && npm install --omit=dev && systemctl restart zauberkoch-api && systemctl is-active zauberkoch-api'
```

Details und Erst-Einrichtung (nginx-Block, systemd-Unit, Certbot, Backup-Timer): `docs/DEPLOY.md`. Infrastruktur-Gesamtdoku: `/Users/martin/CLAUDE.md`.

## KI-Framework-Struktur (dieses Repo)

Dieses Projekt folgt der vollen Claude-Code-Projektstruktur. **Diese Dateien aktiv pflegen** — bei jeder relevanten Änderung am Projekt prüfen, ob sie ein Update brauchen:

| Datei/Ordner | Zweck | Pflege-Regel |
|---|---|---|
| `CLAUDE.md` | Team-Kontext, Befehle, Konventionen | Bei jeder Änderung an Stack, Befehlen, Deploy, SW-Cache-Version aktualisieren |
| `CLAUDE.local.md` | Private Notizen (gitignored) | Nur lokal |
| `.mcp.json` | Team-geteilte MCP-Server | Erweitern, wenn ein MCP-Server projektrelevant wird |
| `.worktreeinclude` | Gitignorte Dateien für neue Worktrees | Ergänzen, wenn neue gitignorte Configs dazukommen (z.B. `.env`) |
| `.claude/settings.json` | Permissions/Hooks (committet) | Neue häufige, sichere Befehle in die Allowlist aufnehmen |
| `.claude/rules/` | Pfad-gebundene Themen-Regeln | Neue Regel-Datei pro neuem Themenbereich; Globs an Struktur anpassen |
| `.claude/skills/` | Projekt-Skills (deploy, release-check) | Checklisten bei Prozess-Änderungen nachziehen |
| `.claude/agents/` | Projekt-Subagenten | Review-Kriterien aktuell halten |
| `.claude/workflows/` | Deterministische Multi-Agent-Scripts | Bei Bedarf erweitern |
