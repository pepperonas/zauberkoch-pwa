# Google OAuth — Einrichtung

Zauberkoch nutzt den **bestehenden Google-OAuth-Client** (derselbe wie xword; Client-ID/Secret liegen auf dem VPS in `/opt/xword-api/.env`).

## Flow

Authorization Code Flow **mit PKCE, komplett server-seitig**:

1. `GET /api/v1/auth/login` → Backend erzeugt `state` + PKCE-Verifier (in Session-Cookie-Vorstufe), Redirect zu Google
2. Google → `GET /api/v1/auth/callback?code=...&state=...`
3. Backend tauscht Code+Verifier gegen Tokens, verifiziert das ID-Token, prüft `OPEN_SIGNUP`/Allowlist, legt User + Session an
4. httpOnly-Session-Cookie (`zk_session`), Redirect auf `/`
5. Frontend fragt `GET /api/v1/me`

Es wird **kein** Google-Token im Browser gespeichert; das Frontend sieht nur das Session-Cookie.

## Manuelle Schritte in der Google Cloud Console (einmalig)

Beim bestehenden OAuth-Client (APIs & Services → Credentials → OAuth 2.0 Client) ergänzen:

**Authorized redirect URIs:**
- `http://localhost:8742/api/v1/auth/callback` (Dev — der Vite-Proxy leitet /api an :8742 weiter, der Callback läuft direkt gegen das Backend)
- `https://zauberkoch.de/api/v1/auth/callback` (Prod)

**Authorized JavaScript origins** (nur falls später One-Tap ergänzt wird):
- `http://localhost:5173`
- `https://zauberkoch.de`

Danach Client-ID/Secret in `backend/.env` (dev) bzw. `/opt/zauberkoch-api/.env` (prod) eintragen.
