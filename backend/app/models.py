"""Database tables.

A Counter is one metering device (one PXR). The reader POSTs one list of
measurements per cycle for a counter. That list is stored as a Reading (one
row, server timestamp, the counter it came from) with one Measurement row per
value. A measurement reaches its counter through its reading.
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, String, TypeDecorator
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def _now() -> datetime:
    return datetime.now(UTC)


class UTCDateTime(TypeDecorator):
    """Timezone-aware UTC datetimes, also on SQLite (which drops the zone)."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return value.astimezone(UTC) if value is not None else None

    def process_result_value(self, value, dialect):
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value


class Counter(Base):
    __tablename__ = "counters"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Short name used in URLs and by the frontend, e.g. "aula", "corp-a".
    code: Mapped[str] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(128))
    # Amperes; the frontend scales the current bars with it.
    rated_current: Mapped[float | None] = mapped_column(Float)

    readings: Mapped[list[Reading]] = relationship(
        back_populates="counter",
        cascade="all, delete-orphan",
    )


class Reading(Base):
    __tablename__ = "readings"
    __table_args__ = (Index("ix_readings_counter_time", "counter_id", "received_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    counter_id: Mapped[int] = mapped_column(
        ForeignKey("counters.id", ondelete="CASCADE")
    )
    received_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=_now, index=True
    )

    counter: Mapped[Counter] = relationship(back_populates="readings", lazy="joined")
    measurements: Mapped[list[Measurement]] = relationship(
        back_populates="reading",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    @property
    def counter_code(self) -> str:
        return self.counter.code


class Measurement(Base):
    __tablename__ = "measurements"

    id: Mapped[int] = mapped_column(primary_key=True)
    reading_id: Mapped[int] = mapped_column(
        ForeignKey("readings.id", ondelete="CASCADE"), index=True
    )
    # Field name from the reader, e.g. "intensity_l1", "voltage_l2".
    name: Mapped[str] = mapped_column(String(64), index=True)
    value: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(16))

    reading: Mapped[Reading] = relationship(back_populates="measurements")
