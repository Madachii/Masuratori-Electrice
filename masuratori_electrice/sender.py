"""POST measurements to the REST endpoint.

The URL is filled in later. The failure branch is intentionally empty for now:
once we know where failed readings should go, it becomes the write there.
"""

from __future__ import annotations

import httpx

from .models import Measurement

API_URL = ""


async def send(measurements: list[Measurement]) -> None:
    if not API_URL:
        return

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                API_URL,
                json=[measurement.model_dump() for measurement in measurements],
            )
            response.raise_for_status()
    except Exception:
        # TODO: store the batch for retry once the failed-reads target is known.
        pass
