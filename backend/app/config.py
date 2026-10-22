"""Settings read from the environment or a .env file."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    # SQLite by default so the project runs with no setup. For Postgres:
    # postgresql+psycopg://user:pass@localhost/masuratori
    database_url: str = "sqlite:///./masuratori.db"

    # Expo dev server (web) origins.
    cors_origins: list[str] = ["http://localhost:8081", "http://localhost:19006"]


settings = Settings()
