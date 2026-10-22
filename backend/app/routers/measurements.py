"""Endpoints the reader writes to and the frontend reads from."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_session
from ..models import Measurement, Reading
from ..schemas import MeasurementIn, ReadingOut, SeriesPoint

router = APIRouter(prefix="/api", tags=["measurements"])

SessionDep = Annotated[Session, Depends(get_session)]


@router.post(
    "/measurements",
    response_model=ReadingOut,
    status_code=status.HTTP_201_CREATED,
)
def create_reading(batch: list[MeasurementIn], session: SessionDep) -> Reading:
    """Store one read cycle from the PXR reader."""
    if not batch:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "empty batch")

    reading = Reading(
        measurements=[
            Measurement(name=item.name, value=item.raw, unit=item.unit)
            for item in batch
        ]
    )
    session.add(reading)
    session.commit()
    return reading


@router.get("/readings/latest", response_model=ReadingOut)
def latest_reading(session: SessionDep) -> Reading:
    reading = session.scalars(
        select(Reading).order_by(Reading.received_at.desc(), Reading.id.desc())
    ).first()
    if reading is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "no readings yet")
    return reading


@router.get("/readings", response_model=list[ReadingOut])
def list_readings(
    session: SessionDep,
    limit: Annotated[int, Query(ge=1, le=1000)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[Reading]:
    """Most recent read cycles first."""
    return list(
        session.scalars(
            select(Reading)
            .order_by(Reading.received_at.desc(), Reading.id.desc())
            .limit(limit)
            .offset(offset)
        )
    )


@router.get("/measurements/{name}", response_model=list[SeriesPoint])
def measurement_series(
    name: str,
    session: SessionDep,
    since: datetime | None = None,
    until: datetime | None = None,
    limit: Annotated[int, Query(ge=1, le=10_000)] = 1000,
) -> list[SeriesPoint]:
    """History of one value, e.g. /api/measurements/intensity_l1, oldest first."""
    query = (
        select(Reading.received_at, Measurement.value, Measurement.unit)
        .join(Measurement.reading)
        .where(Measurement.name == name)
    )
    if since is not None:
        query = query.where(Reading.received_at >= since)
    if until is not None:
        query = query.where(Reading.received_at <= until)

    # Take the newest `limit` points, then return them in time order.
    rows = session.execute(
        query.order_by(Reading.received_at.desc(), Reading.id.desc()).limit(limit)
    ).all()
    return [
        SeriesPoint(received_at=row.received_at, value=row.value, unit=row.unit)
        for row in reversed(rows)
    ]
