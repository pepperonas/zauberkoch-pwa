---
name: release-check
description: Pre-Release-Prüfung für Zauberkoch — Tests, Migrationen, SW-Cache, Secrets-Scan, Motion-/i18n-Konventionen, Doku-Abgleich. Vor jedem Deploy oder auf Zuruf.
---

# Release-Check

Führe alle Prüfungen aus und berichte als kompakte Pass/Fail-Liste. Nichts fixen, ohne es zu berichten.

1. **Tests:** `cd backend && pytest` und `cd frontend && npm test`; Ausgabe bei Fehlschlag zeigen.
2. **Migrationen:** Modelle im Diff geändert? → passende Alembic-Migration vorhanden und `alembic upgrade head` lokal fehlerfrei?
3. **SW-Cache:** App-Shell-Dateien geändert (index.html, src/, tokens.css)? → Cache-Version in SW gebumpt + CLAUDE.md nachgeführt?
4. **Secrets-Scan:** Diff auf hartkodierte Keys/Tokens prüfen; `git ls-files | grep -E '\.env$'` muss leer sein (nur `.env.example` erlaubt).
5. **Konventionen im Diff:** neue Animationen → Spring + reduced-motion-Guard? Neue UI-Strings → in `i18n/de.ts` statt hartcodiert? Neue Farben → Token statt Hex inline? Neue Endpoints → Pydantic-Validierung + Test?
6. **Env & Doku:** neue env-Variablen in `.env.example`? Neue Befehle/Ports/Endpoints in `CLAUDE.md`/`docs/` nachgezogen?
7. **Prompt-Versionierung:** Änderungen an `app/prompts/` = neue Datei/Version, keine In-Place-Änderung einer released Version.

Am Ende: klare Empfehlung „bereit zum Deploy" oder Liste der Blocker.
