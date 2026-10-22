"""Serial port discovery and client construction."""

from __future__ import annotations

from pymodbus.client import AsyncModbusSerialClient
from serial.tools import list_ports

from .models import SerialSettings


def available_ports() -> list[str]:
    return sorted(port.device for port in list_ports.comports())


def build(settings: SerialSettings) -> AsyncModbusSerialClient:
    if not settings.port:
        raise ValueError("a port is required")
    return AsyncModbusSerialClient(
        port=settings.port,
        baudrate=settings.baudrate,
        bytesize=settings.bytesize,
        parity=settings.parity,
        stopbits=settings.stopbits,
        timeout=settings.timeout,
        retries=settings.retries,
    )


async def connect(settings: SerialSettings) -> AsyncModbusSerialClient:
    client = build(settings)
    try:
        if not await client.connect():
            raise ConnectionError(f"cannot open {settings.port}")
    except Exception:
        client.close()
        raise
    return client
