---
name: release-check
description: Pre-Release-Prüfung für Zauberkoch — Tests, SW-Cache-Version, Secrets-Scan, Doku-Abgleich. Vor jedem Deploy oder auf Zuruf ausführen.
---

# Release-Check

Führe alle Prüfungen aus und berichte das Ergebnis als kompakte Pass/Fail-Liste. Nichts fixen, ohne es zu berichten.

1. **Tests:** `npm test` im Root und in `server/` ausführen; Ergebnis mit Ausgabe bei Fehlschlag.
2. **SW-Cache:** Prüfe per `git diff HEAD`, ob App-Shell-Dateien (index.html, `src/`, CSS) geändert wurden. Falls ja: wurde die Cache-Version in `public/sw.js` gebumpt und in `CLAUDE.md` nachgeführt?
3. **Secrets-Scan:** Diff auf hartkodierte Tokens/Passwörter/API-Keys prüfen; `.env`-Dateien dürfen nicht getrackt sein (`git ls-files | grep -i env`).
4. **reduced-motion:** Neue CSS-Animationen/Transitions im Diff → gibt es einen `prefers-reduced-motion`-Guard?
5. **Doku-Abgleich:** Neue Befehle, Ports, Endpoints oder Konventionen im Diff → sind `CLAUDE.md` (und ggf. `docs/DEPLOY.md`, `.claude/rules/`) aktualisiert?
6. **Server-seitige Validierung:** Neue/geänderte Endpoints im Diff → validieren sie Input server-seitig und nutzen Prepared Statements?

Am Ende: klare Empfehlung „bereit zum Deploy" oder Liste der Blocker.
