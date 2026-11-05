"""Read holding registers. Nothing else."""

from __future__ import annotations

from pymodbus.client import AsyncModbusSerialClient
from pymodbus.exceptions import ModbusException
from pymodbus.pdu import ExceptionResponse


async def read(
    client: AsyncModbusSerialClient,
    address: int,
    count: int,
    device_id: int = 2,
) -> list[int]:
    response = await client.read_holding_registers(
        address, count=count, device_id=device_id
    )

    if isinstance(response, ExceptionResponse):
        raise ModbusException(f"modbus exception {response.exception_code}")
    if response.isError():
        raise ModbusException(str(response))

    return list(response.registers)
