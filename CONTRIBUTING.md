# Contributing zu Zauberkoch

Danke für dein Interesse! 🧑‍🍳

## Setup

Der schnellste Weg — ohne lokales Python/Node:

```bash
cp .env.example backend/.env   # ANTHROPIC_API_KEY eintragen, ZK_DEV_LOGIN=true setzen
docker compose -f docker-compose.dev.yml up
# → http://localhost:5173 → „Dev-Login (lokal)"
```

Oder nativ (Python 3.12 + Node 22): siehe [README → Lokales Setup](README.md#lokales-setup). Mit `ZK_DEV_LOGIN=true` in `backend/.env` brauchst du keinen Google-OAuth-Client.

## Regeln

- **Tests sind Pflicht:** `cd backend && pytest` und `cd frontend && npm test` müssen grün sein — die CI erzwingt beides. Neue Endpoints/Funktionen bekommen Tests.
- **Konventionen** stehen in [`CLAUDE.md`](CLAUDE.md) und `.claude/rules/` — Kurzfassung: UI-Strings nur über `src/i18n/de.ts`, Farben nur über Tokens (`tokens.css`), Animationen als Springs mit `prefers-reduced-motion`-Guard, KI-Calls nur in `app/services/ai.py`, System-Prompts werden **versioniert** (neue Datei, nie in place ändern), Schema-Änderungen brauchen eine Alembic-Migration.
- **Keine Secrets** in Commits — `.env` ist gitignored, `.env.example` dokumentiert alle Variablen.
- Code/Kommentare/Commits auf Englisch, UI-Texte auf Deutsch.

## Pull Requests

1. Fork + Feature-Branch
2. Änderung klein und fokussiert halten
3. Tests ergänzen/anpassen, lokal grün
4. PR mit kurzer Beschreibung (Was/Warum); Screenshots bei UI-Änderungen

Bei größeren Ideen: bitte erst ein Issue aufmachen, bevor du viel Zeit investierst.
