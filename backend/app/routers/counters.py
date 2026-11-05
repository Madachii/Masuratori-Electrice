"""Counters: register them, list them, and store readings for one."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db import get_session
from ..models import Counter, Measurement, Reading
from ..schemas import CounterIn, CounterOut, MeasurementIn, ReadingOut

router = APIRouter(prefix="/api/counters", tags=["counters"])

SessionDep = Annotated[Session, Depends(get_session)]


def get_counter(session: Session, code: str) -> Counter:
    counter = session.scalar(select(Counter).where(Counter.code == code))
    if counter is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"unknown counter {code!r}")
    return counter


@router.post("", response_model=CounterOut, status_code=status.HTTP_201_CREATED)
def create_counter(body: CounterIn, session: SessionDep) -> Counter:
    counter = Counter(**body.model_dump())
    session.add(counter)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"counter {body.code!r} already exists"
        ) from None
    return counter


@router.get("", response_model=list[CounterOut])
def list_counters(session: SessionDep) -> list[Counter]:
    return list(session.scalars(select(Counter).order_by(Counter.id)))


@router.get("/{code}", response_model=CounterOut)
def read_counter(code: str, session: SessionDep) -> Counter:
    return get_counter(session, code)


@router.post(
    "/{code}/measurements",
    response_model=ReadingOut,
    status_code=status.HTTP_201_CREATED,
)
def create_reading(
    code: str, batch: list[MeasurementIn], session: SessionDep
) -> Reading:
    """Store one read cycle from the PXR reader for this counter."""
    if not batch:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "empty batch")

    reading = Reading(
        counter=get_counter(session, code),
        measurements=[
            Measurement(name=item.name, value=item.raw, unit=item.unit)
            for item in batch
        ],
    )
    session.add(reading)
    session.commit()
    return reading
