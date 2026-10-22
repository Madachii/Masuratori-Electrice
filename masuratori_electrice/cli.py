"""Minimal command line: health check, or read a register block."""

from __future__ import annotations

import argparse
import asyncio
import logging

from .constants import DEVICE_NAME_ADDRESS, DEVICE_NAME_COUNT
from .health import check
from .measurements import read_all
from .models import HealthStatus, SerialSettings
from .reader import read
from .sender import send
from .transport import connect

MESSAGES = {
    HealthStatus.PORT_ERROR: (
        "cannot open the serial port; check the COM name and close "
        "easySoft, PXPM or any terminal using it"
    ),
    HealthStatus.NO_RESPONSE: (
        "no reply; check A/B polarity, slave id, 19200 8E1, "
        "120 ohm termination and power"
    ),
    HealthStatus.BAD_IDENTITY: "a device answered, but it is not an Eaton PXR",
    HealthStatus.READ_ERROR: "identity matched, but a follow-up read failed",
}


def _health(args: argparse.Namespace) -> int:
    settings = SerialSettings(port=args.port)
    result = asyncio.run(check(settings))

    if result.status is HealthStatus.OK:
        print(f"OK: {result.port}, {result.identity}, unit {settings.device_id}")
    else:
        print(f"FAILED: {MESSAGES[result.status]}")
        if result.port:
            print(f"  port:   {result.port}")
        if result.detail:
            print(f"  detail: {result.detail}")

    return int(result.status)


async def _read_async(args: argparse.Namespace) -> int:
    settings = SerialSettings(port=args.port)
    try:
        client = await connect(settings)
    except Exception as exc:
        print(f"FAILED: {exc}")
        return 1

    try:
        registers = await read(
            client, args.address, args.count, settings.device_id
        )
    except Exception as exc:
        print(f"FAILED: {exc}")
        return 2
    finally:
        client.close()

    print(" ".join(f"{register:04X}" for register in registers))
    return 0


def _read(args: argparse.Namespace) -> int:
    if not args.port:
        print("read needs --port; run health first to find it")
        return 2
    return asyncio.run(_read_async(args))


async def _measure_async(args: argparse.Namespace) -> int:
    settings = SerialSettings(port=args.port)
    health = await check(settings)

    if health.status is not HealthStatus.OK:
        print(f"FAILED: {MESSAGES[health.status]}")
        if health.port:
            print(f"  port:   {health.port}")
        if health.detail:
            print(f"  detail: {health.detail}")
        return int(health.status)

    settings = settings.model_copy(update={"port": health.port})

    try:
        client = await connect(settings)
    except Exception as exc:
        print(f"FAILED: {exc}")
        return 1

    try:
        measurements = await read_all(client, settings.device_id)
    except Exception as exc:
        print(f"FAILED: {exc}")
        return 2
    finally:
        client.close()

    for measurement in measurements:
        print(
            f"{measurement.name:<24} "
            f"{measurement.raw:>12.3f} "
            f"{measurement.unit}"
        )

    await send(measurements)
    return 0


def _measure(args: argparse.Namespace) -> int:
    return asyncio.run(_measure_async(args))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="masuratori")
    parser.add_argument(
        "command",
        nargs="?",
        default="health",
        choices=("health", "read", "measure"),
        help="health (default), read or measure",
    )
    parser.add_argument("--port", help="serial port; health detects one if omitted")
    parser.add_argument("--address", type=int, default=DEVICE_NAME_ADDRESS)
    parser.add_argument("--count", type=int, default=DEVICE_NAME_COUNT)
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)

    pymodbus_log = logging.getLogger("pymodbus")
    if args.verbose:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(message)s"))
        pymodbus_log.addHandler(handler)
        pymodbus_log.setLevel(logging.DEBUG)
    else:
        pymodbus_log.setLevel(logging.CRITICAL)

    if args.command == "health":
        return _health(args)
    if args.command == "read":
        return _read(args)
    return _measure(args)


if __name__ == "__main__":
    raise SystemExit(main())
