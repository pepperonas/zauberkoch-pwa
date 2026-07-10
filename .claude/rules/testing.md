---
paths:
  - "backend/tests/**"
  - "frontend/src/**/*.test.ts"
  - "frontend/src/**/*.test.tsx"
  - "frontend/e2e/**"
description: Test-Regeln
---

# Test-Regeln

- **Backend: pytest.** Jeder Test läuft gegen eine Temp-/In-Memory-SQLite (Fixture aus `conftest.py`), nie gegen `backend/data/`. Anthropic-Client wird IMMER gemockt — kein Test verbraucht echte Tokens.
- Pflicht-Suiten: Auth-Flow (inkl. Allowlist/OPEN_SIGNUP, CSRF), Rate-Limiting (User + global, Tageswechsel), Cache-Logik (Hit/Miss/Regenerieren), Einkaufslisten-Aggregation (Einheiten-Normalisierung), SSE-Parser (Token-Häppchen → semantische Events).
- **Frontend: Vitest** für Mengen-Skalierung und Einheiten-Normalisierung (pure Funktionen, keine DOM-Tests nötig).
- **E2E: ein Playwright-Smoke** (Login gemockt → Rezept generieren mit gemocktem SSE → favorisieren). Läuft lokal, nicht in CI.
- Tests deterministisch: keine echten Netzwerk-Requests, Zeit über Fake-/Freeze-Mechanismen.
- Bugfix = erst reproduzierender Test, dann Fix. Vor jedem Deploy: `pytest` + `npm test` grün (deploy.sh erzwingt es).
