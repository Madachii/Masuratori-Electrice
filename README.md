# Masuratori-Electrice

Modbus RTU tools for Eaton PXR trip units.

## Layout

```
masuratori_electrice/
  models.py        SerialSettings, HealthStatus, HealthResult, Measurement
  constants.py     PXR register addresses
  transport.py     serial client and port discovery
  health.py        channel and identity check
  reader.py        register reads only
  measurements.py  named fields and value decoding
  sender.py        REST POST
  cli.py           command line
  portcheck.py     standalone pyserial check
```

The package folder is the import path (`import masuratori_electrice`). No `src/`
wrapper: this is a flat layout, which is fine for an application.

## Health check

```powershell
uv run masuratori
```

With no arguments it tries every detected serial port, reads the device name,
requires the `EATON PXR` prefix, then reads the product ID and the L1 current.
It prints `OK: COM5, EATON PXR25, unit 2` or a single failure sentence.

To skip discovery:

```powershell
uv run masuratori --port COM5
```

The exit code is the `HealthStatus` value: `0` OK, `1` port error, `2` no
response, `3` wrong identity, `4` follow-up read failed.

## Read

```powershell
uv run masuratori read --port COM5
uv run masuratori read --port COM5 --address 4496 --count 8
```

Prints the registers in hex. It only reads; it does not check health.

## Measure

```powershell
uv run masuratori measure
```

Runs the health check first, then reads these fields:

| name | register | unit | format |
|---|---|---|---|
| `intensity_l1` / `_l2` / `_l3` | 404611 / 404613 / 404615 | A | IEEE float |
| `voltage_l1` / `_l2` / `_l3` | 404631 / 404633 / 404635 | V | IEEE float |
| `active_energy_combined` | 406263 | kWh | 4-register fixed point |

Each value becomes a `Measurement(name, raw, unit)` and the batch is POSTed to
`API_URL` in `sender.py` once per cycle. The URL is empty for now, so the send
is a no-op. The failure branch catches everything and does nothing yet; that is
where the failed-reads store will go.

Voltages are phase-to-neutral (`U_L1-N`). For line-to-line, change the three
`VOLTAGE_*` constants in `constants.py` to `4622 / 4624 / 4626`.

## Port check

```powershell
uv run portcheck
```

Opens each serial port with pyserial and closes it. No Modbus, no reader, no
health logic. This separates "the OS will not open the port" from "the device
does not answer".

## Settings

Baud rate, parity, stop bits and slave address live in `SerialSettings` in
`models.py`. They describe how the device is wired, not something that changes
per run, so they are not command line flags. Defaults are the PXR factory
settings: `19200 8E1`, slave `2`.

## Tests

```powershell
uv run python -m unittest discover -s tests -v
```
