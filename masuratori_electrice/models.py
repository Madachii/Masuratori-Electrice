"""Data types shared by the transport, health check and reader."""

from __future__ import annotations

from enum import IntEnum

from pydantic import BaseModel, Field


class SerialSettings(BaseModel):
    """Serial framing and slave address.

    These are device wiring settings, not per-run choices, so they are not
    command line flags. The defaults are the PXR factory settings.
    """

    port: str | None = None
    baudrate: int = 19_200
    bytesize: int = 8
    parity: str = "E"
    stopbits: int = 1
    timeout: float = 1.0
    retries: int = 1
    device_id: int = Field(default=2, ge=1, le=247)


class HealthStatus(IntEnum):
    """Health check outcome. The value is also the process exit code."""

    OK = 0
    PORT_ERROR = 1
    NO_RESPONSE = 2
    BAD_IDENTITY = 3


class HealthResult(BaseModel):
    status: HealthStatus
    port: str | None = None
    identity: str | None = None
    detail: str = ""


class Measurement(BaseModel):
    """One value as read from one unit on the bus."""

    name: str
    raw: float
    unit: str
    device_id: int | None = Field(default=None, ge=1, le=247)
    # Factory serial number, the stable identity of the counter (not its bus address).
    counter_id: str | None = Field(default=None, max_length=64)
