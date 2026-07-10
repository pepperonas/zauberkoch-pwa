"""Google OAuth 2.0 — Authorization Code Flow with PKCE, fully server-side.

The ID token is received directly from Google's token endpoint over TLS,
so per Google's docs no signature validation is required — we still check
aud / iss / exp / email_verified.
"""

import base64
import hashlib
import json
import secrets
import time
from urllib.parse import urlencode

import httpx

from app.core.config import get_settings

AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
VALID_ISSUERS = ("https://accounts.google.com", "accounts.google.com")


def make_pkce() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
    return verifier, challenge


def build_auth_url(state: str, code_challenge: str) -> str:
    settings = get_settings()
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.oauth_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "prompt": "select_account",
    }
    return f"{AUTH_ENDPOINT}?{urlencode(params)}"


def exchange_code(code: str, code_verifier: str) -> dict:
    """Exchange the authorization code for tokens. Returns Google's token response."""
    settings = get_settings()
    resp = httpx.post(
        TOKEN_ENDPOINT,
        data={
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "code": code,
            "code_verifier": code_verifier,
            "grant_type": "authorization_code",
            "redirect_uri": settings.oauth_redirect_uri,
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def parse_id_token(id_token: str) -> dict | None:
    """Decode + validate the ID-token claims (received directly from Google over TLS)."""
    settings = get_settings()
    try:
        payload_b64 = id_token.split(".")[1]
        claims = json.loads(base64.urlsafe_b64decode(payload_b64 + "=" * (-len(payload_b64) % 4)))
    except (IndexError, ValueError, json.JSONDecodeError):
        return None
    if claims.get("aud") != settings.google_client_id:
        return None
    if claims.get("iss") not in VALID_ISSUERS:
        return None
    if claims.get("exp", 0) < time.time():
        return None
    if not claims.get("email") or not claims.get("email_verified", False):
        return None
    return claims
