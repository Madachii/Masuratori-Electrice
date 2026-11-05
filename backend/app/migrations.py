"""In-place upgrades for databases created by older versions of the app.

``Base.metadata.create_all`` adds missing tables but never alters existing
ones, so a database from before counters keeps a ``readings`` table without
``counter_id``. This module brings such a database up to the current models,
keeping the readings that predate counters under one ``legacy`` counter.
"""

from __future__ import annotations

from sqlalchemy import Engine, inspect, text

LEGACY_COUNTER_CODE = "legacy"
LEGACY_COUNTER_NAME = "Legacy counter"


def upgrade_schema(engine: Engine) -> None:
    """Patch a pre-counter database. Safe to run on every startup."""
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    if "readings" not in tables or "counters" not in tables:
        return
    columns = {column["name"] for column in inspector.get_columns("readings")}
    if "counter_id" in columns:
        return

    with engine.begin() as connection:
        connection.exec_driver_sql(
            "ALTER TABLE readings ADD COLUMN counter_id INTEGER "
            "REFERENCES counters (id) ON DELETE CASCADE"
        )

        if connection.execute(text("SELECT 1 FROM readings LIMIT 1")).first():
            counter_id = connection.execute(
                text("SELECT id FROM counters WHERE code = :code"),
                {"code": LEGACY_COUNTER_CODE},
            ).scalar()
            if counter_id is None:
                connection.execute(
                    text("INSERT INTO counters (code, name) VALUES (:code, :name)"),
                    {"code": LEGACY_COUNTER_CODE, "name": LEGACY_COUNTER_NAME},
                )
                counter_id = connection.execute(
                    text("SELECT id FROM counters WHERE code = :code"),
                    {"code": LEGACY_COUNTER_CODE},
                ).scalar_one()
            connection.execute(
                text(
                    "UPDATE readings SET counter_id = :counter_id "
                    "WHERE counter_id IS NULL"
                ),
                {"counter_id": counter_id},
            )

        connection.exec_driver_sql(
            "CREATE INDEX IF NOT EXISTS ix_readings_counter_time "
            "ON readings (counter_id, received_at)"
        )
