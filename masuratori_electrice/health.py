"""One pre-flight check: is a PXR25 answering on this port?

This module owns no user interface. It returns a HealthResult with a status
code; the CLI turns that code into a sentence.
"""

from __future__ import annotations

from pymodbus.client import AsyncModbusSerialClient
from pymodbus.exceptions import ModbusException, ModbusIOException

from .constants import (
    DEVICE_NAME_ADDRESS,
    DEVICE_NAME_COUNT,
    SERIAL_NUMBER_ADDRESS,
    SERIAL_NUMBER_COUNT,
)
from .models import HealthResult, HealthStatus, SerialSettings
from .reader import read
from .transport import available_ports, connect


def decode_ascii(registers: list[int]) -> str:
    raw = b"".join(register.to_bytes(2, "big") for register in registers)
    return raw.decode("ascii", errors="replace").strip("\x00 ")


async def identify(
    client: AsyncModbusSerialClient,
    device_id: int,
) -> str:
    """Read the 16-character device name from one slave address."""
    registers = await read(
        client,
        DEVICE_NAME_ADDRESS,
        DEVICE_NAME_COUNT,
        device_id,
    )
    return decode_ascii(registers)


async def read_serial(
    client: AsyncModbusSerialClient,
    device_id: int,
) -> str:
    """Read the factory serial number, used as the stable counter id.

    The manual marks the field "if supported"; callers should treat an empty
    string as "this unit has no usable serial number".
    """
    registers = await read(
        client,
        SERIAL_NUMBER_ADDRESS,
        SERIAL_NUMBER_COUNT,
        device_id,
    )
    return decode_ascii(registers)


async def _check_port(settings: SerialSettings) -> HealthResult:
    try:
        client = await connect(settings)
    except Exception as exc:
        return HealthResult(
            status=HealthStatus.PORT_ERROR,
            port=settings.port,
            detail=f"{type(exc).__name__}: {exc}",
        )

    try:
        try:
            identity = await identify(client, settings.device_id)
        except ModbusIOException as exc:
            return HealthResult(
                status=HealthStatus.NO_RESPONSE,
                port=settings.port,
                detail=str(exc),
            )
        except ModbusException as exc:
            return HealthResult(
                status=HealthStatus.BAD_IDENTITY,
                port=settings.port,
                detail=str(exc),
            )
        except Exception as exc:
            return HealthResult(
                status=HealthStatus.PORT_ERROR,
                port=settings.port,
                detail=f"{type(exc).__name__}: {exc}",
            )

        if not identity.startswith("EATON PXR25"):
            return HealthResult(
                status=HealthStatus.BAD_IDENTITY,
                port=settings.port,
                identity=identity,
                detail=f"unexpected identity {identity!r}",
            )

        return HealthResult(
            status=HealthStatus.OK,
            port=settings.port,
            identity=identity,
        )
    finally:
        client.close()


async def check(settings: SerialSettings) -> HealthResult:
    """Check every detected port unless one was given explicitly."""
    ports = [settings.port] if settings.port else available_ports()
    if not ports:
        return HealthResult(
            status=HealthStatus.PORT_ERROR,
            detail="no serial ports found",
        )

    best: HealthResult | None = None
    for port in ports:
        result = await _check_port(settings.model_copy(update={"port": port}))
        if result.status is HealthStatus.OK:
            return result
        if best is None or (
            best.status is HealthStatus.PORT_ERROR
            and result.status is not HealthStatus.PORT_ERROR
        ):
            best = result

    if best is None:
        return HealthResult(
            status=HealthStatus.PORT_ERROR,
            detail="no serial ports found",
        )

    tried = f"tried {', '.join(ports)}"
    best.detail = f"{best.detail}; {tried}" if best.detail else tried
    return best
