"""Register counters and POST measurements to the backend."""

from __future__ import annotations

import logging
import re
from urllib.parse import quote

import httpx

from .models import Measurement

logger = logging.getLogger(__name__)

API_BASE = "http://localhost:8000"


def counter_code(value: str) -> str:
    """Turn a serial number into the backend's counter-code format.

    The backend accepts lowercase letters, digits and dashes, and uses this
    code in the URL. A factory serial like "00600014270" is already valid.
    """
    code = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    return code[:64] or "pxr"


def counter_url(base_url: str, code: str) -> str:
    """URL that stores one read cycle for one counter."""
    return f"{base_url.rstrip('/')}/api/counters/{quote(code, safe='')}/measurements"


async def ensure_counter(
    base_url: str,
    code: str,
    name: str | None = None,
) -> bool:
    """Create the counter if it does not exist yet.

    ``409 Conflict`` means it already exists and is the normal path after the
    first run. Any other failure is logged and leaves the caller to try again.
    """
    target = f"{base_url.rstrip('/')}/api/counters"
    payload = {"code": code, "name": name or code}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(target, json=payload)
        if response.status_code == 409:
            return True
        response.raise_for_status()
        return True
    except Exception as exc:
        logger.warning("counter registration failed for %s: %s", code, exc)
        return False


async def send(measurements: list[Measurement], url: str) -> bool:
    payload = [measurement.model_dump() for measurement in measurements]
    logger.info("POST %s (%d values): %s", url, len(payload), payload)

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
        return True
    except Exception as exc:
        # TODO: store the batch for retry once the failed-reads target is known.
        logger.warning("send failed: %s", exc)
        return False
