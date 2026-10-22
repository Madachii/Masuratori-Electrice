"""Unit tests that need no hardware."""

from __future__ import annotations

import struct
import unittest
from unittest.mock import patch

from pymodbus.exceptions import ModbusException, ModbusIOException
from pymodbus.pdu import ExceptionResponse

from masuratori_electrice.health import _decode_ascii, _read
from masuratori_electrice.measurements import decode_energy, decode_float, read_all
from masuratori_electrice.models import HealthStatus, SerialSettings
from masuratori_electrice.reader import read


class _Response:
    def __init__(self, registers: list[int]) -> None:
        self.registers = registers

    def isError(self) -> bool:  # noqa: N802 - pymodbus API
        return False


class _StubClient:
    def __init__(self, response=None, error: Exception | None = None) -> None:
        self.response = response
        self.error = error

    async def read_holding_registers(
        self,
        address: int,
        *,
        count: int = 1,
        device_id: int = 1,
    ):
        if self.error is not None:
            raise self.error
        return self.response


class DecodeTests(unittest.TestCase):
    def test_device_name(self) -> None:
        registers = [
            0x4541,  # EA
            0x544F,  # TO
            0x4E20,  # N
            0x5058,  # PX
            0x5232,  # R2
            0x3500,  # 5
            0x0000,
            0x0000,
        ]
        self.assertEqual(_decode_ascii(registers), "EATON PXR25")


class HealthReadTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.settings = SerialSettings(port="COM1")

    async def test_valid_response(self) -> None:
        status, registers, _ = await _read(
            _StubClient(_Response([1, 2])), self.settings, 4496, 2
        )
        self.assertIs(status, HealthStatus.OK)
        self.assertEqual(registers, [1, 2])

    async def test_timeout(self) -> None:
        status, _, _ = await _read(
            _StubClient(error=ModbusIOException("no response")),
            self.settings,
            4496,
            2,
        )
        self.assertIs(status, HealthStatus.NO_RESPONSE)

    async def test_exception_response(self) -> None:
        status, _, _ = await _read(
            _StubClient(ExceptionResponse(3, exception_code=2)),
            self.settings,
            4496,
            2,
        )
        self.assertIs(status, HealthStatus.BAD_IDENTITY)


class ReaderTests(unittest.IsolatedAsyncioTestCase):
    async def test_exception_raises(self) -> None:
        client = _StubClient(ExceptionResponse(3, exception_code=2))
        with self.assertRaises(ModbusException):
            await read(client, 4496, 8)


class DecodeValueTests(unittest.TestCase):
    def test_float_low_word_first(self) -> None:
        high, low = struct.unpack(">HH", struct.pack(">f", 230.5))
        self.assertAlmostEqual(decode_float([low, high]), 230.5)

    def test_energy_scale(self) -> None:
        # mantissa 3, exponent 1, factor 0 -> 2 * 3 = 6
        self.assertEqual(decode_energy([3, 0, 0, 0x0100]), 6.0)

    def test_energy_factor(self) -> None:
        # mantissa 1, exponent 0, factor 2 -> 1 * 100 = 100
        self.assertEqual(decode_energy([1, 0, 0, 0x0002]), 100.0)


class ReadAllTests(unittest.IsolatedAsyncioTestCase):
    async def test_builds_every_measurement(self) -> None:
        async def fake_read(client, address, count, device_id=2):
            return [0, 0x42C8] if count == 2 else [1, 0, 0, 0]

        with patch("masuratori_electrice.measurements.read", new=fake_read):
            measurements = await read_all(None)

        self.assertEqual(len(measurements), 7)
        self.assertEqual(
            [measurement.name for measurement in measurements],
            [
                "intensity_l1",
                "intensity_l2",
                "intensity_l3",
                "voltage_l1",
                "voltage_l2",
                "voltage_l3",
                "active_energy_combined",
            ],
        )
        self.assertEqual(measurements[0].unit, "A")
        self.assertEqual(measurements[3].unit, "V")
        self.assertEqual(measurements[-1].unit, "kWh")
        self.assertEqual(measurements[-1].raw, 1.0)


if __name__ == "__main__":
    unittest.main()
