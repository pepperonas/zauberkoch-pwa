---
name: deploy
description: Deploy Zauberkoch auf den VPS (Frontend rsync + Backend systemd-Restart) — nur nach grünen Tests und SW-Cache-Bump
disable-model-invocation: true
argument-hint: "[frontend|backend|all]"
---

# Deploy Zauberkoch → zauberkoch.celox.io

Deploye `$ARGUMENTS` (Default: `all`). Arbeite die `checklist.md` in diesem Skill-Ordner Punkt für Punkt ab — kein Schritt darf übersprungen werden.

## Frontend

```bash
cd /Users/martin/claude/zauberkoch
npm test && npm run build
rsync -avz --delete dist/ root@69.62.121.168:/var/www/zauberkoch.celox.io/
```

## Backend

```bash
cd /Users/martin/claude/zauberkoch/server && npm test
rsync -avz --exclude node_modules --exclude data --exclude .env \
  ./ root@69.62.121.168:/opt/zauberkoch-api/
ssh root@69.62.121.168 'cd /opt/zauberkoch-api && npm install --omit=dev && systemctl restart zauberkoch-api && systemctl is-active zauberkoch-api'
```

## Nach dem Deploy

- `systemctl is-active zauberkoch-api` muss `active` liefern; sonst sofort `journalctl -u zauberkoch-api -n 50` prüfen und Ergebnis berichten.
- Smoke-Test: `curl -sf https://zauberkoch.celox.io/api/health` (sobald der Endpoint existiert).
- Bei Fehlschlag: NICHT stumm erneut deployen — Ursache berichten.

Solange `docs/DEPLOY.md` den Status „noch nicht eingerichtet" trägt, zuerst die dortige Erst-Einrichtungs-Checkliste ausführen.
