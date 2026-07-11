"""Cleanup job + dev-login guards + cache prompt-version + history dedup."""

from datetime import datetime, timedelta, timezone

import pytest

from app.core.config import get_settings
from app.services import ratelimit_ip
from tests.test_auth import add_to_allowlist  # noqa: F401
from tests.test_generation import PARAMS, generate, logged_in, mock_ai  # noqa: F401 (fixtures)


@pytest.fixture(autouse=True)
def _reset_ip_limits():
    ratelimit_ip.reset()
    yield
    ratelimit_ip.reset()


def test_cleanup_removes_expired_sessions_and_old_limits(db_session):
    from app.models import RateLimit, Session as SessionModel, User
    from app.services.maintenance import cleanup

    user = User(google_sub="s1", email="a@example.com")
    db_session.add(user)
    db_session.flush()
    now = datetime.now(timezone.utc)
    db_session.add(SessionModel(token="expired", csrf_token="x", user_id=user.id, expires_at=now - timedelta(days=1)))
    db_session.add(SessionModel(token="valid", csrf_token="x", user_id=user.id, expires_at=now + timedelta(days=1)))
    db_session.add(RateLimit(scope="global", day="2020-01-01", count=5))
    db_session.add(RateLimit(scope="global", day=now.date().isoformat(), count=1))
    db_session.commit()

    result = cleanup()
    assert result == {"sessions": 1, "rate_limits": 1}
    remaining = [s.token for s in db_session.query(SessionModel).all()]
    assert remaining == ["valid"]


def test_dev_login_disabled_by_default(client):
    assert client.get("/api/v1/auth/dev-login", follow_redirects=False).status_code == 404


def test_dev_login_works_when_enabled(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "zk_dev_login", True)
    r = client.get("/api/v1/auth/dev-login", follow_redirects=False)
    assert r.status_code == 303
    me = client.get("/api/v1/me")
    assert me.status_code == 200
    assert me.json()["email"] == "dev@zauberkoch.local"


def test_dev_login_hard_refused_in_prod(client, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "zk_dev_login", True)
    monkeypatch.setattr(settings, "zk_env", "prod")
    assert client.get("/api/v1/auth/dev-login", follow_redirects=False).status_code == 404


def test_cache_miss_on_newer_prompt_version(client, logged_in, mock_ai, monkeypatch):  # noqa: F811
    from app.services import ai

    generate(client, logged_in)  # fills cache under current version
    monkeypatch.setattr(ai, "prompt_version", lambda: "v999")
    events = generate(client, logged_in)  # same params, new version -> live again
    assert events[-1][1]["cached"] is False
    assert mock_ai["count"] == 2


def test_history_deduplicates_identical_results(client, logged_in, mock_ai):  # noqa: F811
    """Repeats regenerate now; if a variation lands on a title the user already
    has (mock always returns the same variant), it must not duplicate history."""
    generate(client, logged_in)  # original
    generate(client, logged_in)  # repeat -> variation "Variante: …" (new row)
    generate(client, logged_in)  # repeat -> same variant title -> deduped
    items = client.get("/api/v1/recipes").json()["items"]
    assert len(items) == 2
