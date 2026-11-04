"""Unit tests that need no hardware."""

from __future__ import annotations

import struct
import unittest
from unittest.mock import AsyncMock, patch

from pymodbus.exceptions import ModbusException, ModbusIOException
from pymodbus.pdu import ExceptionResponse

from masuratori_electrice.health import check, decode_ascii
from masuratori_electrice.measurements import decode_energy, decode_float, read_all
from masuratori_electrice.models import HealthStatus, SerialSettings
from masuratori_electrice.reader import read

DEVICE_NAME = [0x4541, 0x544F, 0x4E20, 0x5058, 0x5232, 0x3500, 0x0000, 0x0000]


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


class _OpenClient:
    def close(self) -> None:
        pass


class DecodeTests(unittest.TestCase):
    def test_device_name(self) -> None:
        self.assertEqual(decode_ascii(DEVICE_NAME), "EATON PXR25")


class HealthTests(unittest.IsolatedAsyncioTestCase):
    async def test_pxr25_is_ok(self) -> None:
        async def fake_read(client, address, count, device_id=2):
            return DEVICE_NAME

        with (
            patch(
                "masuratori_electrice.health.connect",
                new=AsyncMock(return_value=_OpenClient()),
            ),
            patch("masuratori_electrice.health.read", new=fake_read),
        ):
            result = await check(SerialSettings(port="COM1"))

        self.assertIs(result.status, HealthStatus.OK)
        self.assertEqual(result.identity, "EATON PXR25")

    async def test_pxr20_is_rejected(self) -> None:
        async def fake_read(client, address, count, device_id=2):
            return DEVICE_NAME[:5] + [0x3000, 0x0000, 0x0000]

        with (
            patch(
                "masuratori_electrice.health.connect",
                new=AsyncMock(return_value=_OpenClient()),
            ),
            patch("masuratori_electrice.health.read", new=fake_read),
        ):
            result = await check(SerialSettings(port="COM1"))

        self.assertIs(result.status, HealthStatus.BAD_IDENTITY)

    async def test_timeout(self) -> None:
        with (
            patch(
                "masuratori_electrice.health.connect",
                new=AsyncMock(return_value=_OpenClient()),
            ),
            patch(
                "masuratori_electrice.health.read",
                new=AsyncMock(side_effect=ModbusIOException("no response")),
            ),
        ):
            result = await check(SerialSettings(port="COM1"))

        self.assertIs(result.status, HealthStatus.NO_RESPONSE)


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

        self.assertEqual(len(measurements), 26)
        self.assertEqual(measurements[0].name, "intensity_l1")
        self.assertEqual(measurements[0].unit, "A")
        self.assertEqual(measurements[5].name, "voltage_l1_l2")
        self.assertEqual(measurements[-1].name, "apparent_power_demand")
        self.assertEqual(measurements[-1].unit, "VA")

        by_name = {measurement.name: measurement for measurement in measurements}
        self.assertEqual(by_name["power_factor"].unit, "")
        self.assertEqual(by_name["frequency"].unit, "Hz")
        self.assertEqual(by_name["active_energy_combined"].raw, 1.0)


if __name__ == "__main__":
    unittest.main()
