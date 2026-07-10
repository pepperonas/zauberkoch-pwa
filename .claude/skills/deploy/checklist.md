# Deploy-Checkliste

Vor dem Deploy:

- [ ] `git status` sauber bzw. nur beabsichtigte Änderungen
- [ ] `npm test` (Root) grün
- [ ] `cd server && npm test` grün (bei Backend-Deploy)
- [ ] App-Shell geändert? → SW-Cache-Version `zauberkoch-vN` in `public/sw.js` gebumpt UND in `CLAUDE.md` nachgeführt
- [ ] Keine Secrets im Diff (`git diff` auf .env-Werte, Tokens, Passwörter prüfen)
- [ ] `CLAUDE.md` aktuell (neue Befehle/Endpoints/Konventionen dokumentiert)

Nach dem Deploy:

- [ ] `systemctl is-active zauberkoch-api` = active (Backend)
- [ ] Smoke-Test der Live-URL
- [ ] Änderungen committet & gepusht
