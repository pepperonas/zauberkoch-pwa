# Deploy — zauberkoch.de

**Status: ✅ LIVE seit 2026-07-10.** Erst-Einrichtung abgeschlossen: DNS ✓, systemd `zauberkoch-api` (Port 8742) ✓, nginx-vHost + Let's-Encrypt-Cert ✓, Backup-Timer (03:45) ✓, Allowlist (martinpaush@gmail.com, martin.pfeffer@celox.io) ✓. **Eigener Google-OAuth-Client** (`575245359999-…`, Redirect-URI registriert & verifiziert); Creds in `/opt/zauberkoch-api/.env`.

## Ziel-Setup (VPS 69.62.121.168, systemd + zentraler nginx — KEIN Docker)

| Komponente | Wert |
|---|---|
| Frontend-Webroot | `/var/www/zauberkoch.de/` (statischer Vite-Build, SPA-Fallback) |
| Backend | `/opt/zauberkoch-api/` — venv + Code, systemd `zauberkoch-api`, Port **8742** loopback |
| Daten | `/opt/zauberkoch-api/data/zauberkoch.db` (SQLite WAL) |
| Secrets | `/opt/zauberkoch-api/.env` (mode 640, root:www-data) — Vorlage: `.env.example` |
| nginx | eigener vHost `zauberkoch.de` + `www` (301 → Apex); `/api/` → 127.0.0.1:8742; **`/api/v1/recipes/generate` mit `proxy_buffering off` + `proxy_read_timeout 300s`** (SSE); Security-Header (CSP, HSTS) |
| TLS | `certbot --nginx -d zauberkoch.de -d www.zauberkoch.de` |
| Backup | `zauberkoch-backup.timer` nächtlich 03:45 → `/var/backups/zauberkoch/` (sqlite3 `.backup`, gzip, 14 Tage Rotation) |

Port 8742 vor der Einrichtung auf Kollision prüfen: `ssh root@69.62.121.168 'ss -tlnp | grep 8742'`.

## Erst-Einrichtung (Checkliste)

1. **DNS** beim Registrar: A-Records `zauberkoch.de` und `www.zauberkoch.de` → `69.62.121.168`; verifizieren mit `dig +short zauberkoch.de`
2. Verzeichnisse anlegen: `/var/www/zauberkoch.de/`, `/opt/zauberkoch-api/{data}/`
3. Python-3.12-venv auf dem VPS: `python3.12 -m venv /opt/zauberkoch-api/.venv`
4. `.env` anlegen (mode 640): Werte aus `.env.example`; `GOOGLE_CLIENT_ID/SECRET` aus dem bestehenden Client (siehe `/opt/xword-api/.env`), `SESSION_SECRET` neu (`openssl rand -hex 32`), `ZK_ENV=prod`, `ZK_BASE_URL=https://zauberkoch.de`
5. **Google Console:** Redirect-URI `https://zauberkoch.de/api/v1/auth/callback` beim bestehenden OAuth-Client ergänzen (docs/GOOGLE-OAUTH.md)
6. `deploy/zauberkoch-api.service` nach `/etc/systemd/system/` + `daemon-reload` + `enable`
7. nginx-vHost aus `deploy/nginx-vhost.conf` nach `/etc/nginx/sites-available/` + Symlink + `nginx -t && systemctl reload nginx`
8. Certbot (Schritt 1 muss propagiert sein)
9. Backup-Timer aus `deploy/` installieren + `systemctl enable --now zauberkoch-backup.timer`
10. Erster Deploy: `./deploy/deploy.sh` (führt auch `alembic upgrade head` auf dem VPS aus)
11. Allowlist befüllen: `ssh root@69.62.121.168 'cd /opt/zauberkoch-api && .venv/bin/python -m scripts.allowlist add martinpaush@gmail.com'` (+ martin.pfeffer@celox.io)
12. Live-Smoke: Login → Generierung streamt → Favorit

## Regel-Deploy

`./deploy/deploy.sh [backend|frontend|all]` — erzwingt vorher `pytest` + `npm test`. Details in `deploy/deploy.sh` und `.claude/skills/deploy/`.
