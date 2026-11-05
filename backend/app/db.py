"""SQLAlchemy engine, session factory and the FastAPI session dependency."""

from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings


class Base(DeclarativeBase):
    pass


def enable_sqlite_foreign_keys(engine: Engine) -> None:
    """SQLite ignores foreign keys unless each connection turns them on."""

    @event.listens_for(engine, "connect")
    def _on_connect(dbapi_connection, _):
        dbapi_connection.execute("PRAGMA foreign_keys=ON")


def make_engine(url: str) -> Engine:
    if not url.startswith("sqlite"):
        return create_engine(url)

    # SQLite refuses use from another thread by default; FastAPI runs sync
    # endpoints in a thread pool, so turn that check off.
    engine = create_engine(url, connect_args={"check_same_thread": False})
    enable_sqlite_foreign_keys(engine)
    return engine


engine = make_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def get_session() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session
