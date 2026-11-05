"""A believable PXR25 reading, without hardware.

The field names and units come from `measurements.FIELDS`, so the simulated
batch is accepted by the same sender and backend as a real one.
"""

from __future__ import annotations

import math
import random

from .measurements import FIELDS
from .models import Measurement


# Fake serials for testing several counters without hardware.
SIMULATED_COUNTER_IDS = (
    "SIM-PXR25-001",
    "SIM-PXR25-002",
    "SIM-PXR25-003",
)


class Simulator:
    def __init__(
        self,
        rated_current: float = 100.0,
        counter_id: str = SIMULATED_COUNTER_IDS[0],
    ) -> None:
        self.rated_current = rated_current
        self.counter_id = counter_id
        self.t = 0.0
        self.wh_forward = 12_000.0
        self.wh_reverse = 0.0
        self.vah = 13_000.0
        self.demand = [0.0, 0.0, 0.0]
        self.peak = [0.0, 0.0, 0.0]
        self.started = False

    @staticmethod
    def _noise(amplitude: float) -> float:
        return random.uniform(-amplitude, amplitude)

    def next(self) -> list[Measurement]:
        self.t += 1.0
        dt = 1.0

        load = 0.55 + 0.10 * math.sin(self.t / 18.0)
        factors = (1.0, 0.94, 1.06)
        currents = [
            self.rated_current * load * factor
            + self._noise(self.rated_current * 0.02)
            for factor in factors
        ]

        phase_voltage = [
            230.0 + 3.0 * math.sin(self.t / 15.0 + phase) + self._noise(0.8)
            for phase in range(3)
        ]
        line_voltage = [
            math.sqrt(3) * (phase_voltage[i] + phase_voltage[j]) / 2.0
            + self._noise(0.8)
            for i, j in ((0, 1), (1, 2), (2, 0))
        ]

        power_factor = 0.93 + 0.03 * math.sin(self.t / 22.0)
        apparent_power = sum(
            phase_voltage[i] * currents[i] for i in range(3)
        )
        active_power = apparent_power * power_factor
        reactive_power = math.sqrt(
            max(apparent_power * apparent_power - active_power * active_power, 0.0)
        )
        frequency = 50.0 + 0.02 * math.sin(self.t / 10.0) + self._noise(0.01)

        real = sum(
            currents[i] * math.cos(2.0 * math.pi * i / 3.0) for i in range(3)
        )
        imag = sum(
            currents[i] * math.sin(2.0 * math.pi * i / 3.0) for i in range(3)
        )
        neutral_current = math.hypot(real, imag)
        ground_current = 0.1 + abs(self._noise(0.05))

        self.wh_forward += active_power * dt / 3600.0
        self.vah += apparent_power * dt / 3600.0

        instant = (active_power, reactive_power, apparent_power)
        if not self.started:
            self.demand = list(instant)
            self.started = True
        else:
            self.demand = [
                self.demand[i] * 0.9 + instant[i] * 0.1 for i in range(3)
            ]
        self.peak = [max(self.peak[i], self.demand[i]) for i in range(3)]

        values = {
            "intensity_l1": currents[0],
            "intensity_l2": currents[1],
            "intensity_l3": currents[2],
            "intensity_ground": ground_current,
            "intensity_neutral": neutral_current,
            "voltage_l1_l2": line_voltage[0],
            "voltage_l2_l3": line_voltage[1],
            "voltage_l3_l1": line_voltage[2],
            "voltage_l1_n": phase_voltage[0],
            "voltage_l2_n": phase_voltage[1],
            "voltage_l3_n": phase_voltage[2],
            "active_power": active_power,
            "reactive_power": reactive_power,
            "apparent_power": apparent_power,
            "power_factor": power_factor,
            "frequency": frequency,
            "active_energy_forward": self.wh_forward / 1000.0,
            "active_energy_reverse": self.wh_reverse / 1000.0,
            "active_energy_combined": (self.wh_forward + self.wh_reverse) / 1000.0,
            "apparent_energy": self.vah / 1000.0,
            "peak_active_power": self.peak[0],
            "peak_reactive_power": self.peak[1],
            "peak_apparent_power": self.peak[2],
            "active_power_demand": self.demand[0],
            "reactive_power_demand": self.demand[1],
            "apparent_power_demand": self.demand[2],
        }

        return [
            Measurement(
                name=field.name,
                raw=round(values[field.name], 3),
                unit=field.unit,
                counter_id=self.counter_id,
            )
            for field in FIELDS
        ]
