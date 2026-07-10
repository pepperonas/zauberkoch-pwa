---
paths:
  - "tests/**"
  - "server/tests/**"
  - "**/*.test.js"
description: Test-Regeln
---

# Test-Regeln

- Test-Runner: **`node --test`** (node:test + node:assert) — keine zusätzlichen Test-Frameworks.
- Backend-Tests laufen gegen eine **In-Memory- oder Temp-SQLite-DB**, nie gegen `server/data/`.
- Tests sind deterministisch: keine echten Netzwerk-Requests, keine Zeitabhängigkeit ohne Fake-Timer.
- **Vor jedem Deploy müssen `npm test` (Root) und `cd server && npm test` grün sein** — kein Deploy mit roten oder übersprungenen Tests.
- Bugfixes bekommen zuerst einen reproduzierenden Test, dann den Fix.
- Testnamen beschreiben Verhalten („rejects recipe title over 200 chars"), nicht Implementierung.
