"""Request and response bodies.

MeasurementIn matches `Measurement` in the reader's models.py field for field,
so the reader can POST `[m.model_dump() for m in measurements]` unchanged.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CounterIn(BaseModel):
    code: str = Field(min_length=1, max_length=64, pattern=r"^[a-z0-9][a-z0-9-]*$")
    name: str = Field(min_length=1, max_length=128)
    rated_current: float | None = Field(default=None, gt=0)


class CounterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    rated_current: float | None


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
    counter_id: int
    counter: str = Field(validation_alias="counter_code")
    received_at: datetime
    measurements: list[MeasurementOut]


class SeriesPoint(BaseModel):
    """One point of a single measurement over time, for charts."""

    received_at: datetime
    value: float
    unit: str
