"""Probe a Modbus RTU bus for live slave addresses.

A missing slave must not stop the sweep: every address is probed in its own
try/except, so unit 7 timing out does not hide units 8 and up.
"""

from __future__ import annotations

import logging
from collections.abc import Callable

from pymodbus.client import AsyncModbusSerialClient

from .health import identify
from .models import SerialSettings
from .transport import connect

logger = logging.getLogger(__name__)


async def scan_units(
    client: AsyncModbusSerialClient,
    start: int = 1,
    end: int = 247,
    on_found: Callable[[int, str], None] | None = None,
) -> list[tuple[int, str]]:
    """Return ``(unit, identity)`` for every address that answers."""
    found: list[tuple[int, str]] = []

    for unit in range(start, end + 1):
        try:
            identity = await identify(client, unit)
        except Exception as exc:
            logger.debug("unit %03d: %s", unit, exc)
            continue

        if not identity:
            continue

        found.append((unit, identity))
        if on_found is not None:
            on_found(unit, identity)

    return found


async def scan_port(
    settings: SerialSettings,
    start: int = 1,
    end: int = 247,
    on_found: Callable[[int, str], None] | None = None,
) -> list[tuple[int, str]]:
    """Open one serial port and scan it; the caller handles port errors."""
    client = await connect(settings)
    try:
        return await scan_units(client, start, end, on_found)
    finally:
        client.close()
