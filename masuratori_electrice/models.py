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
    READ_ERROR = 4


class HealthResult(BaseModel):
    status: HealthStatus
    port: str | None = None
    identity: str | None = None
    detail: str = ""


class Measurement(BaseModel):
    """One value as read from the device."""

    name: str
    raw: float
    unit: str
