"""Auth endpoints: Google OAuth login/callback, logout."""

import logging
import secrets

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.core.config import get_settings
from app.core.security import (
    SESSION_COOKIE,
    STATE_COOKIE,
    clear_session_cookie,
    create_session,
    get_current_session,
    require_csrf,
    set_session_cookie,
    sign_payload,
    unsign_payload,
)
from app.db import get_db
from app.models import AllowlistEntry, Session as SessionModel, User
from app.services import google_oauth
from app.services.ratelimit_ip import check_ip_limit

logger = logging.getLogger("zauberkoch.auth")
router = APIRouter(prefix="/auth")


def _frontend_url(path: str = "/") -> str:
    return f"{get_settings().zk_base_url.rstrip('/')}{path}"


@router.get("/login")
def login(request: Request) -> Response:
    check_ip_limit(request, scope="auth", limit=20, window_s=60)
    state = secrets.token_urlsafe(24)
    verifier, challenge = google_oauth.make_pkce()
    response = RedirectResponse(google_oauth.build_auth_url(state, challenge), status_code=307)
    response.set_cookie(
        STATE_COOKIE,
        sign_payload({"state": state, "verifier": verifier}),
        max_age=600,
        httponly=True,
        samesite="lax",
        secure=get_settings().is_prod,
        path="/api/v1/auth",
    )
    return response


@router.get("/callback")
def callback(
    request: Request,
    code: str = "",
    state: str = "",
    error: str = "",
    db: DbSession = Depends(get_db),
) -> Response:
    check_ip_limit(request, scope="auth", limit=20, window_s=60)
    settings = get_settings()

    def fail(reason: str) -> Response:
        logger.info("oauth callback rejected: %s", reason)
        resp = RedirectResponse(_frontend_url(f"/?login_error={reason}"), status_code=303)
        resp.delete_cookie(STATE_COOKIE, path="/api/v1/auth")
        return resp

    if error or not code or not state:
        return fail("cancelled")

    stashed = unsign_payload(request.cookies.get(STATE_COOKIE, ""))
    if not stashed or stashed.get("state") != state:
        return fail("state_mismatch")

    try:
        tokens = google_oauth.exchange_code(code, stashed["verifier"])
    except Exception:
        logger.exception("token exchange failed")
        return fail("exchange_failed")

    claims = google_oauth.parse_id_token(tokens.get("id_token", ""))
    if claims is None:
        return fail("invalid_token")

    email = claims["email"].lower()
    user = db.execute(select(User).where(User.google_sub == claims["sub"])).scalar_one_or_none()

    if user is None:
        # New signup: gate through allowlist unless open signup is enabled
        if not settings.open_signup:
            allowed = db.execute(select(AllowlistEntry).where(AllowlistEntry.email == email)).scalar_one_or_none()
            if allowed is None:
                return fail("not_allowed")
        user = User(google_sub=claims["sub"], email=email)
        db.add(user)

    user.email = email
    user.name = claims.get("name", "") or user.name
    user.picture_url = claims.get("picture", "") or user.picture_url
    db.commit()

    session = create_session(db, user)
    response = RedirectResponse(_frontend_url("/"), status_code=303)
    response.delete_cookie(STATE_COOKIE, path="/api/v1/auth")
    set_session_cookie(response, session)
    logger.info("login ok user=%s", user.id)
    return response


@router.get("/dev-login")
def dev_login(request: Request, db: DbSession = Depends(get_db)) -> Response:
    """Local development only: instant login without a Google client.
    Hard-refused unless ZK_DEV_LOGIN=true AND not running in prod."""
    settings = get_settings()
    if settings.is_prod or not settings.zk_dev_login:
        return Response(status_code=404)
    check_ip_limit(request, scope="auth", limit=20, window_s=60)
    email = "dev@zauberkoch.local"
    user = db.execute(select(User).where(User.google_sub == "dev-local")).scalar_one_or_none()
    if user is None:
        user = User(google_sub="dev-local", email=email, name="Dev-Koch")
        db.add(user)
        db.commit()
    session = create_session(db, user)
    response = RedirectResponse(_frontend_url("/"), status_code=303)
    set_session_cookie(response, session)
    logger.warning("DEV LOGIN used (ZK_DEV_LOGIN=true)")
    return response


@router.post("/logout", dependencies=[Depends(require_csrf)])
def logout(
    session: SessionModel = Depends(get_current_session),
    db: DbSession = Depends(get_db),
) -> Response:
    db.delete(session)
    db.commit()
    response = Response(status_code=204)
    clear_session_cookie(response)
    return response
