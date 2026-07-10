---
name: deploy
description: Deploy Zauberkoch auf den VPS (Backend systemd + Frontend-Webroot via deploy.sh) — nur nach grünen Tests
disable-model-invocation: true
argument-hint: "[backend|frontend|all]"
---

# Deploy Zauberkoch → zauberkoch.de

Deploye `$ARGUMENTS` (Default: `all`). Arbeite `checklist.md` in diesem Ordner Punkt für Punkt ab — kein Schritt darf übersprungen werden.

Der Standardweg ist das Skript:

```bash
/Users/martin/claude/zauberkoch/deploy/deploy.sh $ARGUMENTS
```

Es führt aus: `pytest` (backend) + `npm test` (frontend) → `npm run build` → rsync Backend nach `/opt/zauberkoch-api/` (ohne `.venv`, `data/`, `.env`) + `pip install` bei geänderten requirements → rsync `frontend/dist/` nach `/var/www/zauberkoch.de/` → `systemctl restart zauberkoch-api` → Healthcheck `https://zauberkoch.de/api/v1/health`.

## Nach dem Deploy

- `ssh root@69.62.121.168 'systemctl is-active zauberkoch-api'` muss `active` liefern, sonst sofort `journalctl -u zauberkoch-api -n 50` prüfen und Befund berichten.
- Smoke: Login-Seite lädt, `curl -sf https://zauberkoch.de/api/v1/health`.
- Bei Fehlschlag NICHT stumm erneut deployen — Ursache berichten.

Solange `docs/DEPLOY.md` den Status „noch nicht eingerichtet" trägt, zuerst die dortige Erst-Einrichtung (DNS, systemd-Unit, nginx-vHost, certbot, .env, Backup-Timer) durchführen.
