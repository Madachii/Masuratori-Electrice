# Masuratori-Electrice

Modbus RTU tools for Eaton PXR25 trip units.

## Layout

```
masuratori_electrice/
  models.py        SerialSettings, HealthStatus, HealthResult, Measurement
  constants.py     PXR register addresses
  transport.py     serial client and port discovery
  health.py        one identity check before measuring
  reader.py        register reads only
  scan.py          probe a range of slave addresses
  measurements.py  26 named fields and value decoding
  simulator.py     plausible PXR25 data, no hardware
  sender.py        POST to the backend
  cli.py           command line
```

The package folder is the import path (`import masuratori_electrice`).

## Health check

```powershell
uv run masuratori
```

One check: open the port, read the 8-register device name, require
`EATON PXR25`. No other probes. With no `--port` it tries every detected port.

```powershell
uv run masuratori --port COM5 --unit 7
```

Exit codes: `0` OK, `1` port error, `2` no response, `3` wrong identity.

## Read

```powershell
uv run masuratori read --port COM5
uv run masuratori read --port COM5 --unit 7 --address 4496 --count 8
```

Prints raw registers in hex. It does not run the health check.

## Measure

```powershell
uv run masuratori measure
```

Runs the health check once, then reads 26 values: currents `I_L1..I_L3, I_N,
I_G`; voltages `U_L1L2..U_L3L1` and `U_L1N..U_L3N`; active, reactive and
apparent power; power factor; frequency; forward, reverse and combined active
energy plus apparent energy; peak and demand power. Each value becomes a
`Measurement(name, raw, unit, device_id)` and the batch is POSTed once.

Several trip units on one RS485 bus:

```powershell
uv run masuratori measure --port COM5 --units 2,7,10-12
uv run masuratori measure --port COM5 --unit 7
```

Each unit is read and POSTed separately. A unit that does not answer is
reported and skipped, so unit 7 timing out does not stop units 8 and up.
`--units` accepts commas and ranges; `--unit` is the single-unit form. Both
need an explicit `--port`.

## Scan

```powershell
uv run masuratori scan --port COM5
uv run masuratori scan --port COM5 --start 1 --end 16 --timeout 0.2
```

Probes each slave address in the range, reads the device name, and prints every
device that answers. The default range is `1-247` and the default timeout is
`0.2 s`; a full 247-address scan can take about a minute. A dead address only
costs one timeout and the scan continues.

Exit codes: `0` at least one PXR found, `2` nothing found, `1` port error.

## Simulate

```powershell
uv run masuratori simulate
```

Generates a believable PXR25 batch every second and POSTs it to
`http://localhost:8000/api/measurements`. The values move smoothly with noise,
energy accumulates, and the payload is logged at INFO.

Start the backend first:

```powershell
cd backend
uv run uvicorn app.main:app --port 8000
```

Point it elsewhere with `--url http://host:8000/api/measurements`.

## Settings

Baud rate, parity and stop bits live in `SerialSettings` in `models.py`.
They describe how the bus is wired, not something that changes per run, so they
are not command line flags. Defaults: `19200 8E1`.

The slave address is chosen per run with `--unit` or `--units`; it defaults to
`2`, the PXR factory setting. Valid addresses are `1-247` (`0` is broadcast and
`248-255` are reserved).

## Tests

```powershell
uv run python -m unittest discover -s tests -v
```
