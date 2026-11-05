"""Scanning tests; no serial hardware required."""

from __future__ import annotations

import unittest
from unittest.mock import patch

from pymodbus.exceptions import ModbusIOException

from masuratori_electrice.cli import parse_units
from masuratori_electrice.measurements import read_all
from masuratori_electrice.scan import scan_units


class ScanTests(unittest.IsolatedAsyncioTestCase):
    async def test_a_dead_unit_does_not_stop_the_scan(self) -> None:
        async def fake_identify(client, unit, device_id=None):
            if unit in (2, 8):
                return "EATON PXR25"
            raise ModbusIOException(f"unit {unit} timed out")

        with patch("masuratori_electrice.scan.identify", new=fake_identify):
            found = await scan_units(None, 1, 10)

        self.assertEqual(
            found,
            [(2, "EATON PXR25"), (8, "EATON PXR25")],
        )

    async def test_found_callback_runs_for_each_device(self) -> None:
        async def fake_identify(client, unit, device_id=None):
            if unit == 3:
                return "EATON PXR25"
            raise ModbusIOException("no response")

        seen: list[tuple[int, str]] = []

        with patch("masuratori_electrice.scan.identify", new=fake_identify):
            await scan_units(None, 1, 3, on_found=lambda u, i: seen.append((u, i)))

        self.assertEqual(seen, [(3, "EATON PXR25")])


class ParseUnitsTests(unittest.TestCase):
    def test_list_and_range(self) -> None:
        self.assertEqual(parse_units("2,7,10-12"), [2, 7, 10, 11, 12])

    def test_duplicates_are_removed(self) -> None:
        self.assertEqual(parse_units("2,2,3,2-3"), [2, 3])

    def test_out_of_range_is_rejected(self) -> None:
        for value in ("0", "248", "10-2", ""):
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    parse_units(value)


class ReadAllUnitTests(unittest.IsolatedAsyncioTestCase):
    async def test_every_value_carries_the_slave_id(self) -> None:
        async def fake_read(client, address, count, device_id=2):
            return [0, 0] if count == 2 else [0, 0, 0, 0]

        with patch("masuratori_electrice.measurements.read", new=fake_read):
            measurements = await read_all(None, device_id=7)

        self.assertTrue(measurements)
        self.assertTrue(all(item.device_id == 7 for item in measurements))


if __name__ == "__main__":
    unittest.main()
