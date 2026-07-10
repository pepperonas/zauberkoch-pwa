# Deploy-Checkliste

Vor dem Deploy:

- [ ] `git status` sauber bzw. nur beabsichtigte Änderungen
- [ ] `cd backend && pytest` grün
- [ ] `cd frontend && npm test` grün
- [ ] Neue Alembic-Migration vorhanden, falls Modelle geändert? (`alembic upgrade head` läuft auf dem VPS im deploy.sh)
- [ ] App-Shell geändert? → SW-Cache `zauberkoch-vN` gebumpt UND in CLAUDE.md nachgeführt
- [ ] Neue env-Variablen? → `.env.example` aktualisiert UND auf dem VPS in `/opt/zauberkoch-api/.env` ergänzt
- [ ] Keine Secrets im Diff (Keys, Tokens, Passwörter)
- [ ] Prompt geändert? → neue Version in `app/prompts/`, nicht alte überschrieben

Nach dem Deploy:

- [ ] `systemctl is-active zauberkoch-api` = active
- [ ] `curl -sf https://zauberkoch.de/api/v1/health` OK
- [ ] Live-Smoke: Landing lädt, Login funktioniert, eine Generierung streamt
- [ ] Änderungen committet & gepusht
