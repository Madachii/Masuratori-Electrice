"""POST measurements to the backend."""

from __future__ import annotations

import logging

import httpx

from .models import Measurement

logger = logging.getLogger(__name__)

API_URL = "http://localhost:8000/api/measurements"


async def send(measurements: list[Measurement], url: str | None = None) -> bool:
    target = url or API_URL
    payload = [measurement.model_dump() for measurement in measurements]
    logger.info("POST %s (%d values): %s", target, len(payload), payload)

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(target, json=payload)
            response.raise_for_status()
        return True
    except Exception as exc:
        # TODO: store the batch for retry once the failed-reads target is known.
        logger.warning("send failed: %s", exc)
        return False
