"""Read the named measurements and turn the registers into values."""

from __future__ import annotations

import struct
from dataclasses import dataclass

from pymodbus.client import AsyncModbusSerialClient

from .constants import (
    ACTIVE_ENERGY_COMBINED_ADDRESS,
    ACTIVE_ENERGY_COMBINED_COUNT,
    CURRENT_COUNT,
    CURRENT_L1_ADDRESS,
    CURRENT_L2_ADDRESS,
    CURRENT_L3_ADDRESS,
    FLOAT_LOW_WORD_FIRST,
    VOLTAGE_COUNT,
    VOLTAGE_L1_ADDRESS,
    VOLTAGE_L2_ADDRESS,
    VOLTAGE_L3_ADDRESS,
)
from .models import Measurement
from .reader import read


@dataclass(frozen=True)
class Field:
    name: str
    address: int
    count: int
    unit: str
    kind: str


FIELDS = (
    Field("intensity_l1", CURRENT_L1_ADDRESS, CURRENT_COUNT, "A", "float"),
    Field("intensity_l2", CURRENT_L2_ADDRESS, CURRENT_COUNT, "A", "float"),
    Field("intensity_l3", CURRENT_L3_ADDRESS, CURRENT_COUNT, "A", "float"),
    Field("voltage_l1", VOLTAGE_L1_ADDRESS, VOLTAGE_COUNT, "V", "float"),
    Field("voltage_l2", VOLTAGE_L2_ADDRESS, VOLTAGE_COUNT, "V", "float"),
    Field("voltage_l3", VOLTAGE_L3_ADDRESS, VOLTAGE_COUNT, "V", "float"),
    Field(
        "active_energy_combined",
        ACTIVE_ENERGY_COMBINED_ADDRESS,
        ACTIVE_ENERGY_COMBINED_COUNT,
        "kWh",
        "energy",
    ),
)


def decode_float(registers: list[int]) -> float:
    first, second = registers[0], registers[1]
    if FLOAT_LOW_WORD_FIRST:
        first, second = second, first
    return struct.unpack(">f", struct.pack(">HH", first, second))[0]


def decode_energy(registers: list[int]) -> float:
    """Decode the four-register energy object: 2^a * mantissa * 10^b."""
    mantissa = registers[0] | (registers[1] << 16) | (registers[2] << 32)
    exponent = registers[3] >> 8
    factor = registers[3] & 0xFF
    return float((2**exponent) * mantissa * (10**factor))


async def read_all(
    client: AsyncModbusSerialClient,
    device_id: int = 2,
) -> list[Measurement]:
    measurements: list[Measurement] = []

    for field in FIELDS:
        registers = await read(client, field.address, field.count, device_id)
        value = (
            decode_float(registers)
            if field.kind == "float"
            else decode_energy(registers)
        )
        measurements.append(
            Measurement(name=field.name, raw=value, unit=field.unit)
        )

    return measurements
