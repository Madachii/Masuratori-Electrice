"""Verify that a Modbus RTU channel is usable and a PXR is on the other end.

This module owns no user interface. It returns a HealthResult with a status
code; the CLI turns that code into a sentence.
"""

from __future__ import annotations

from pymodbus.client import AsyncModbusSerialClient
from pymodbus.exceptions import ConnectionException, ModbusIOException
from pymodbus.pdu import ExceptionResponse

from .constants import (
    CURRENT_L1_ADDRESS,
    CURRENT_COUNT,
    DEVICE_NAME_ADDRESS,
    DEVICE_NAME_COUNT,
    PRODUCT_ID_ADDRESS,
    PRODUCT_ID_COUNT,
)
from .models import HealthResult, HealthStatus, SerialSettings
from .transport import available_ports, connect


def _decode_ascii(registers: list[int]) -> str:
    raw = b"".join(register.to_bytes(2, "big") for register in registers)
    return raw.decode("ascii", errors="replace").strip("\x00 ")


async def _read(
    client: AsyncModbusSerialClient,
    settings: SerialSettings,
    address: int,
    count: int,
) -> tuple[HealthStatus, list[int], str]:
    try:
        response = await client.read_holding_registers(
            address, count=count, device_id=settings.device_id
        )
    except ModbusIOException as exc:
        return HealthStatus.NO_RESPONSE, [], str(exc)
    except ConnectionException as exc:
        return HealthStatus.PORT_ERROR, [], str(exc)
    except Exception as exc:
        return HealthStatus.PORT_ERROR, [], f"{type(exc).__name__}: {exc}"

    if isinstance(response, ExceptionResponse):
        return (
            HealthStatus.BAD_IDENTITY,
            [],
            f"modbus exception {response.exception_code}",
        )
    if response.isError():
        return HealthStatus.NO_RESPONSE, [], str(response)

    return HealthStatus.OK, list(response.registers), ""


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
        status, registers, detail = await _read(
            client, settings, DEVICE_NAME_ADDRESS, DEVICE_NAME_COUNT
        )
        if status is not HealthStatus.OK:
            return HealthResult(status=status, port=settings.port, detail=detail)

        identity = _decode_ascii(registers)
        if not identity.startswith("EATON PXR"):
            return HealthResult(
                status=HealthStatus.BAD_IDENTITY,
                port=settings.port,
                identity=identity,
                detail=f"unexpected identity {identity!r}",
            )

        follow_up = (
            (PRODUCT_ID_ADDRESS, PRODUCT_ID_COUNT, "product id"),
            (CURRENT_L1_ADDRESS, CURRENT_COUNT, "current"),
        )
        for address, count, label in follow_up:
            status, _, detail = await _read(client, settings, address, count)
            if status is not HealthStatus.OK:
                return HealthResult(
                    status=HealthStatus.READ_ERROR,
                    port=settings.port,
                    identity=identity,
                    detail=f"{label} read failed: {detail}",
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
