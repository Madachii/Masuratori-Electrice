"""Request and response bodies.

MeasurementIn matches `Measurement` in the reader's models.py field for field,
so the reader can POST `[m.model_dump() for m in measurements]` unchanged.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MeasurementIn(BaseModel):
    name: str = Field(max_length=64)
    raw: float
    unit: str = Field(max_length=16)


class MeasurementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    value: float
    unit: str


class ReadingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    received_at: datetime
    measurements: list[MeasurementOut]


class SeriesPoint(BaseModel):
    """One point of a single measurement over time, for charts."""

    received_at: datetime
    value: float
    unit: str
