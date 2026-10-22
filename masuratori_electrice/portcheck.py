"""Standalone serial port check.

Opens each port with pyserial and closes it. No Modbus, no reader, no health
logic: this only answers "does the OS let me open this COM port".
"""

from __future__ import annotations

import serial
from serial.tools import list_ports

BAUDRATE = 19_200


def main() -> int:
    ports = sorted(port.device for port in list_ports.comports())
    if not ports:
        print("no serial ports found")
        return 1

    for port in ports:
        try:
            with serial.Serial(port, BAUDRATE, timeout=0.2):
                print(f"{port}: open OK")
        except serial.SerialException as exc:
            print(f"{port}: {exc}")

    return 0
