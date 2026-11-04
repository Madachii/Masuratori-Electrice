"""Minimal command line: health, read, measure, simulate."""

from __future__ import annotations

import argparse
import asyncio
import logging
import time

from .constants import DEVICE_NAME_ADDRESS, DEVICE_NAME_COUNT
from .health import check, identify
from .measurements import read_all
from .models import HealthResult, HealthStatus, SerialSettings
from .reader import read
from .scan import scan_port
from .sender import send
from .simulator import Simulator
from .transport import connect

MESSAGES = {
    HealthStatus.PORT_ERROR: (
        "cannot open the serial port; check the COM name and close "
        "any program using it"
    ),
    HealthStatus.NO_RESPONSE: (
        "no reply; check A/B polarity, slave id, 19200 8E1, "
        "120 ohm termination and power"
    ),
    HealthStatus.BAD_IDENTITY: "a device answered, but it is not a PXR25",
}


def _unit_arg(value: str) -> int:
    try:
        unit = int(value)
    except ValueError:
        raise argparse.ArgumentTypeError("unit must be an integer") from None
    if not 1 <= unit <= 247:
        raise argparse.ArgumentTypeError("unit must be between 1 and 247")
    return unit


def parse_units(value: str) -> list[int]:
    """Parse ``2,7,10-12`` into a de-duplicated list of slave IDs."""
    units: list[int] = []

    for part in value.split(","):
        part = part.strip()
        if not part:
            continue

        if "-" in part:
            first, last = part.split("-", 1)
            start, end = int(first), int(last)
        else:
            start = end = int(part)

        if not (1 <= start <= 247 and 1 <= end <= 247 and start <= end):
            raise ValueError(f"unit range outside 1..247: {part!r}")

        for unit in range(start, end + 1):
            if unit not in units:
                units.append(unit)

    if not units:
        raise ValueError("no units given")

    return units


def _print_failure(result: HealthResult) -> None:
    print(f"FAILED: {MESSAGES[result.status]}")
    if result.port:
        print(f"  port:   {result.port}")
    if result.detail:
        print(f"  detail: {result.detail}")


def _health(args: argparse.Namespace) -> int:
    settings = SerialSettings(port=args.port, device_id=args.unit or 2)
    result = asyncio.run(check(settings))

    if result.status is HealthStatus.OK:
        print(f"OK: {result.port}, {result.identity}, unit {settings.device_id}")
    else:
        _print_failure(result)

    return int(result.status)


async def _read_async(args: argparse.Namespace) -> int:
    settings = SerialSettings(port=args.port, device_id=args.unit or 2)
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


async def _scan_async(args: argparse.Namespace) -> int:
    if not args.port:
        print("scan needs --port; for example --port COM5")
        return 2
    if args.start > args.end:
        print("--start must be less than or equal to --end")
        return 2

    timeout = args.timeout if args.timeout is not None else 0.2
    if timeout <= 0:
        print("--timeout must be greater than zero")
        return 2
    settings = SerialSettings(port=args.port, timeout=timeout, retries=0)
    speed = f"{settings.baudrate} {settings.bytesize}{settings.parity}{settings.stopbits}"

    print(
        f"scanning {args.port}, units {args.start:03d}-{args.end:03d} "
        f"at {speed}"
    )

    try:
        found = await scan_port(
            settings,
            args.start,
            args.end,
            on_found=lambda unit, identity: print(
                f"  unit {unit:03d}: {identity}"
            ),
        )
    except Exception as exc:
        print(f"FAILED: cannot open {args.port}: {exc}")
        return 1

    pxr = [item for item in found if item[1].startswith("EATON PXR")]
    if not found:
        print(
            "no device answered; check A/B, 24 V DC, 19200 8E1, "
            "termination and slave IDs"
        )
        return 2

    print(f"{len(pxr)} PXR unit(s) found, {len(found)} device(s) answered")
    if not pxr:
        print("none of the devices identified as EATON PXR")
        return 2

    return 0


def _scan(args: argparse.Namespace) -> int:
    return asyncio.run(_scan_async(args))


async def _measure_units_async(
    args: argparse.Namespace,
    units: list[int],
) -> int:
    if not args.port:
        print("measure --unit/--units needs --port")
        return 2

    timeout = args.timeout if args.timeout is not None else 1.0
    if timeout <= 0:
        print("--timeout must be greater than zero")
        return 2
    settings = SerialSettings(port=args.port, timeout=timeout)

    try:
        client = await connect(settings)
    except Exception as exc:
        print(f"FAILED: {exc}")
        return 1

    read_ok = 0
    try:
        for unit in units:
            try:
                identity = await identify(client, unit)
                if not identity.startswith("EATON PXR"):
                    print(f"unit {unit:03d}: {identity!r} is not a PXR; skipping")
                    continue

                measurements = await read_all(client, unit)
            except Exception as exc:
                print(f"unit {unit:03d}: FAILED ({exc})")
                continue

            print(f"\nunit {unit:03d}  {identity}")
            for measurement in measurements:
                print(
                    f"{measurement.name:<24} "
                    f"{measurement.raw:>12.3f} "
                    f"{measurement.unit}"
                )

            await send(measurements, args.url)
            read_ok += 1
    finally:
        client.close()

    print(f"\n{read_ok}/{len(units)} unit(s) read")
    return 0 if read_ok else 2


async def _measure_async(args: argparse.Namespace) -> int:
    settings = SerialSettings(port=args.port)
    result = await check(settings)
    if result.status is not HealthStatus.OK:
        _print_failure(result)
        return int(result.status)

    settings = settings.model_copy(update={"port": result.port})

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

    await send(measurements, args.url)
    return 0


def _measure(args: argparse.Namespace) -> int:
    if args.unit is not None and args.units:
        print("use --unit or --units, not both")
        return 2

    if args.units:
        try:
            units = parse_units(args.units)
        except ValueError as exc:
            print(f"FAILED: {exc}")
            return 2
        return asyncio.run(_measure_units_async(args, units))

    if args.unit is not None:
        return asyncio.run(_measure_units_async(args, [args.unit]))

    return asyncio.run(_measure_async(args))


async def _simulate_async(args: argparse.Namespace) -> None:
    simulator = Simulator()
    while True:
        started = time.monotonic()
        await send(simulator.next(), args.url)
        elapsed = time.monotonic() - started
        await asyncio.sleep(max(0.0, 1.0 - elapsed))


def _simulate(args: argparse.Namespace) -> int:
    try:
        asyncio.run(_simulate_async(args))
    except KeyboardInterrupt:
        print("stopped")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="masuratori")
    parser.add_argument(
        "command",
        nargs="?",
        default="health",
        choices=("health", "read", "measure", "scan", "simulate"),
        help="health (default), read, measure, scan or simulate",
    )
    parser.add_argument("--port", help="serial port; health detects one if omitted")
    parser.add_argument("--unit", type=_unit_arg, help="slave address (1-247)")
    parser.add_argument("--units", help="comma/range list for measure, e.g. 2,7,10-12")
    parser.add_argument("--start", type=_unit_arg, default=1, help="scan first unit")
    parser.add_argument("--end", type=_unit_arg, default=247, help="scan last unit")
    parser.add_argument(
        "--timeout",
        type=float,
        help="response timeout in seconds (scan default 0.2, measure default 1.0)",
    )
    parser.add_argument("--address", type=int, default=DEVICE_NAME_ADDRESS)
    parser.add_argument("--count", type=int, default=DEVICE_NAME_COUNT)
    parser.add_argument("--url", help="REST endpoint (default: localhost:8000)")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

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
    if args.command == "measure":
        return _measure(args)
    if args.command == "scan":
        return _scan(args)
    return _simulate(args)


if __name__ == "__main__":
    raise SystemExit(main())
