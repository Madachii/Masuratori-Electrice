"""Read the named measurements and turn the registers into values."""

from __future__ import annotations

import struct
from dataclasses import dataclass

from pymodbus.client import AsyncModbusSerialClient

from .constants import (
    ACTIVE_ENERGY_COMBINED_ADDRESS,
    ACTIVE_ENERGY_FORWARD_ADDRESS,
    ACTIVE_ENERGY_REVERSE_ADDRESS,
    ACTIVE_POWER_ADDRESS,
    ACTIVE_POWER_DEMAND_ADDRESS,
    APPARENT_ENERGY_ADDRESS,
    APPARENT_POWER_ADDRESS,
    APPARENT_POWER_DEMAND_ADDRESS,
    CURRENT_COUNT,
    CURRENT_GROUND_ADDRESS,
    CURRENT_L1_ADDRESS,
    CURRENT_L2_ADDRESS,
    CURRENT_L3_ADDRESS,
    CURRENT_NEUTRAL_ADDRESS,
    ENERGY_COUNT,
    FLOAT_LOW_WORD_FIRST,
    FREQUENCY_ADDRESS,
    PEAK_ACTIVE_POWER_ADDRESS,
    PEAK_APPARENT_POWER_ADDRESS,
    PEAK_REACTIVE_POWER_ADDRESS,
    POWER_COUNT,
    POWER_FACTOR_ADDRESS,
    REACTIVE_POWER_ADDRESS,
    REACTIVE_POWER_DEMAND_ADDRESS,
    VOLTAGE_COUNT,
    VOLTAGE_L1_L2_ADDRESS,
    VOLTAGE_L1_N_ADDRESS,
    VOLTAGE_L2_L3_ADDRESS,
    VOLTAGE_L2_N_ADDRESS,
    VOLTAGE_L3_L1_ADDRESS,
    VOLTAGE_L3_N_ADDRESS,
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
    Field("intensity_ground", CURRENT_GROUND_ADDRESS, CURRENT_COUNT, "A", "float"),
    Field("intensity_neutral", CURRENT_NEUTRAL_ADDRESS, CURRENT_COUNT, "A", "float"),
    Field("voltage_l1_l2", VOLTAGE_L1_L2_ADDRESS, VOLTAGE_COUNT, "V", "float"),
    Field("voltage_l2_l3", VOLTAGE_L2_L3_ADDRESS, VOLTAGE_COUNT, "V", "float"),
    Field("voltage_l3_l1", VOLTAGE_L3_L1_ADDRESS, VOLTAGE_COUNT, "V", "float"),
    Field("voltage_l1_n", VOLTAGE_L1_N_ADDRESS, VOLTAGE_COUNT, "V", "float"),
    Field("voltage_l2_n", VOLTAGE_L2_N_ADDRESS, VOLTAGE_COUNT, "V", "float"),
    Field("voltage_l3_n", VOLTAGE_L3_N_ADDRESS, VOLTAGE_COUNT, "V", "float"),
    Field("active_power", ACTIVE_POWER_ADDRESS, POWER_COUNT, "W", "float"),
    Field("reactive_power", REACTIVE_POWER_ADDRESS, POWER_COUNT, "Var", "float"),
    Field("apparent_power", APPARENT_POWER_ADDRESS, POWER_COUNT, "VA", "float"),
    Field("power_factor", POWER_FACTOR_ADDRESS, POWER_COUNT, "", "float"),
    Field("frequency", FREQUENCY_ADDRESS, POWER_COUNT, "Hz", "float"),
    Field(
        "active_energy_forward",
        ACTIVE_ENERGY_FORWARD_ADDRESS,
        ENERGY_COUNT,
        "kWh",
        "energy",
    ),
    Field(
        "active_energy_reverse",
        ACTIVE_ENERGY_REVERSE_ADDRESS,
        ENERGY_COUNT,
        "kWh",
        "energy",
    ),
    Field(
        "active_energy_combined",
        ACTIVE_ENERGY_COMBINED_ADDRESS,
        ENERGY_COUNT,
        "kWh",
        "energy",
    ),
    Field("apparent_energy", APPARENT_ENERGY_ADDRESS, ENERGY_COUNT, "kVAh", "energy"),
    Field("peak_active_power", PEAK_ACTIVE_POWER_ADDRESS, POWER_COUNT, "W", "float"),
    Field("peak_reactive_power", PEAK_REACTIVE_POWER_ADDRESS, POWER_COUNT, "Var", "float"),
    Field("peak_apparent_power", PEAK_APPARENT_POWER_ADDRESS, POWER_COUNT, "VA", "float"),
    Field("active_power_demand", ACTIVE_POWER_DEMAND_ADDRESS, POWER_COUNT, "W", "float"),
    Field(
        "reactive_power_demand",
        REACTIVE_POWER_DEMAND_ADDRESS,
        POWER_COUNT,
        "Var",
        "float",
    ),
    Field(
        "apparent_power_demand",
        APPARENT_POWER_DEMAND_ADDRESS,
        POWER_COUNT,
        "VA",
        "float",
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
            Measurement(
                name=field.name,
                raw=value,
                unit=field.unit,
                device_id=device_id,
            )
        )

    return measurements
