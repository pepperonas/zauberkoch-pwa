"""Shared test fixtures: temp SQLite DB + TestClient. No real network calls."""

import os
import tempfile
from pathlib import Path

import pytest

# Deterministic test settings BEFORE app imports
os.environ.setdefault("ZK_ENV", "test")
os.environ.setdefault("SESSION_SECRET", "test-secret")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-client-secret")
os.environ.setdefault("ANTHROPIC_API_KEY", "test-anthropic-key")
os.environ.setdefault("OPEN_SIGNUP", "false")

_tmpdir = tempfile.mkdtemp(prefix="zauberkoch-test-")
os.environ["ZK_DB_PATH"] = str(Path(_tmpdir) / "test.db")

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app import db as app_db  # noqa: E402
from app.db import Base  # noqa: E402
from app import models  # noqa: E402,F401
from app.main import create_app  # noqa: E402


@pytest.fixture()
def db_session():
    """Fresh schema per test on the temp DB."""
    Base.metadata.drop_all(app_db.engine)
    Base.metadata.create_all(app_db.engine)
    session = app_db.SessionLocal()
    yield session
    session.close()


@pytest.fixture()
def client(db_session):
    app = create_app()
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _default_new_user_limit_off(monkeypatch):
    """Most tests generate many recipes -> give fresh test accounts the global
    default (daily_limit stays NULL). Tests that check the small-new-user cap
    set default_new_user_limit explicitly."""
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "default_new_user_limit", None)
    yield
