---
paths:
  - "backend/**"
description: Backend-Regeln (FastAPI, SQLAlchemy, Sicherheit, KI-Pipeline)
---

# Backend-Regeln

- **FastAPI + SQLAlchemy 2 (typed, `Mapped[]`) + Pydantic v2.** Sync-SQLite mit WAL; DB-Datei nur unter `backend/data/` (gitignored).
- **Jede Schema-Änderung braucht eine Alembic-Migration** — nie `create_all` als Ersatz in Prod-Pfaden.
- **Input-Validierung server-seitig** über Pydantic-Schemas; Limits/Zugriffskontrolle nie dem Client überlassen.
- Konsistentes Fehlerformat `{"error": {"code", "message"}}` mit korrektem HTTP-Status; keine Stacktraces an den Client. 429 enthält `retry_after`.
- **Secrets nur aus Settings/env** (`app/core/config.py`), niemals hartcodieren oder loggen. `ANTHROPIC_API_KEY` verlässt den Server nie.
- Sessions: httpOnly + SameSite=Lax (+ Secure in prod), DB-gestützt, Ablauf serverseitig geprüft. CSRF-Double-Submit auf allen state-changing Routen.
- **Anthropic-Calls nur in `app/services/ai.py`**, immer Streaming (`client.messages.stream`), Modell aus `ANTHROPIC_MODEL`. Kein `temperature` o.ä. hartkodieren.
- Rezept-Prompts nur in `app/prompts/` (versioniert); Prompt-Version am Rezept persistieren. Prompt-Änderung = neue Version, alte bleibt.
- Structured Logging (JSON) über `app/core/logging.py` — kein `print`.
- Neue Endpoints bekommen pytest-Tests (Temp-DB-Fixture, Anthropic gemockt — nie echte API-Calls in Tests).
