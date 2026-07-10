---
paths:
  - "server/**"
description: Backend-Regeln (Express, SQLite, Sicherheit)
---

# API-Design-Regeln

- **Express + better-sqlite3**, synchrones DB-API, WAL-Mode. DB-Dateien nur unter `server/data/` (gitignored).
- **Jeder Endpoint validiert Input server-seitig** (Typ, Länge, Wertebereich) — Client-Validierung ist nur UX.
- **Sicherheitsrelevante Logik nur server-seitig** — der Client bekommt keine Punktwerte, Secrets oder Autorisierungsentscheidungen.
- Konsistentes Fehlerformat: `{ error: "message" }` mit korrektem HTTP-Status; keine Stacktraces oder interne Pfade an den Client.
- **Rate-Limits** auf Auth- und Schreib-Endpoints (Muster: xword/xchange `lib/rate-limit`).
- Secrets ausschließlich aus `process.env` (lokal `server/.env`, auf dem VPS `/opt/zauberkoch-api/.env` mode 640) — niemals hartkodieren oder loggen.
- Server bindet **loopback-only** (Port 4251); nginx terminiert TLS und proxied `/api/`.
- Prepared Statements für alle Queries — nie String-Interpolation in SQL.
- Neue Endpoints bekommen einen Test in `server/tests/`, bevor sie deployed werden.
