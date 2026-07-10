"""SQLAlchemy engine/session setup (SQLite, WAL mode)."""

from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


def _configure_sqlite(dbapi_connection, _record) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.close()


def make_engine(db_url: str | None = None):
    settings = get_settings()
    if db_url is None:
        settings.db_path.parent.mkdir(parents=True, exist_ok=True)
        db_url = f"sqlite:///{settings.db_path}"
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    event.listen(engine, "connect", _configure_sqlite)
    return engine


engine = make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
