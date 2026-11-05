"""Read endpoints for the frontend, optionally narrowed to one counter."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from ..db import get_session
from ..models import Measurement, Reading
from ..schemas import ReadingOut, SeriesPoint
from .counters import get_counter

router = APIRouter(prefix="/api", tags=["measurements"])

SessionDep = Annotated[Session, Depends(get_session)]
CounterQuery = Annotated[
    str | None, Query(description="counter code, e.g. aula; all counters if omitted")
]
NEWEST_FIRST = (Reading.received_at.desc(), Reading.id.desc())


def _for_counter(query: Select, session: Session, code: str | None) -> Select:
    if code is None:
        return query
    return query.where(Reading.counter_id == get_counter(session, code).id)


@router.get("/readings/latest", response_model=ReadingOut)
def latest_reading(session: SessionDep, counter: CounterQuery = None) -> Reading:
    query = _for_counter(select(Reading), session, counter)
    reading = session.scalars(query.order_by(*NEWEST_FIRST)).first()
    if reading is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "no readings yet")
    return reading


@router.get("/readings", response_model=list[ReadingOut])
def list_readings(
    session: SessionDep,
    counter: CounterQuery = None,
    limit: Annotated[int, Query(ge=1, le=1000)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[Reading]:
    """Most recent read cycles first."""
    query = _for_counter(select(Reading), session, counter)
    return list(
        session.scalars(query.order_by(*NEWEST_FIRST).limit(limit).offset(offset))
    )


@router.get("/measurements/{name}", response_model=list[SeriesPoint])
def measurement_series(
    name: str,
    counter: str,
    session: SessionDep,
    since: datetime | None = None,
    until: datetime | None = None,
    limit: Annotated[int, Query(ge=1, le=10_000)] = 1000,
) -> list[SeriesPoint]:
    """History of one value of one counter, oldest first.

    e.g. /api/measurements/intensity_l1?counter=aula
    """
    query = _for_counter(
        select(Reading.received_at, Measurement.value, Measurement.unit)
        .join(Measurement.reading)
        .where(Measurement.name == name),
        session,
        counter,
    )
    if since is not None:
        query = query.where(Reading.received_at >= since)
    if until is not None:
        query = query.where(Reading.received_at <= until)

    # Take the newest `limit` points, then return them in time order.
    rows = session.execute(query.order_by(*NEWEST_FIRST).limit(limit)).all()
    return [
        SeriesPoint(received_at=row.received_at, value=row.value, unit=row.unit)
        for row in reversed(rows)
    ]
