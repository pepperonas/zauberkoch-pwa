# Zauberkoch 🧑‍🍳🍸

KI-Rezept- & Cocktail-Generator — **https://zauberkoch.de**

Der Nutzer wählt Geschmacksrichtung, Länderküche und Rahmenbedingungen; die Claude-API liefert ein vollständiges, hochwertiges Rezept mit exakten Mengen — live gestreamt, das Rezept baut sich vor den Augen des Nutzers auf.

**Stack:** FastAPI + SQLite + SQLAlchemy 2 · Anthropic API (Streaming/SSE) · React 19 + Vite + TS strict · Material 3 Expressive (handgebaut) + Motion-Spring-Physik · Google OAuth (PKCE, httpOnly-Sessions) · systemd + nginx auf VPS.

## Lokales Setup

```bash
# Backend
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env        # Werte eintragen (Anthropic-Key, Google-Creds, SESSION_SECRET)
alembic upgrade head
uvicorn app.main:app --reload --port 8742

# Frontend (zweites Terminal)
cd frontend
npm install
npm run dev                    # http://localhost:5173, /api → Proxy auf :8742
```

Google-OAuth-Einrichtung (Redirect-URIs für localhost + Prod): `docs/GOOGLE-OAUTH.md`.
Deployment (systemd, nginx-vHost, certbot, Backups): `docs/DEPLOY.md` und `deploy/`.

## Tests

```bash
cd backend && pytest           # Auth, Rate-Limiting, Cache, Aggregation, SSE-Parser
cd frontend && npm test        # Mengen-Skalierung, Einheiten-Normalisierung
cd frontend && npx playwright test   # E2E-Smoke
```

## Lizenz

© 2026 Martin Pfeffer | celox.io
