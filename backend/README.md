# Backend

FastAPI + SQLAlchemy. Stores the measurements the PXR reader sends and serves
them to the frontend.

## Run

```powershell
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

Interactive docs: http://localhost:8000/docs

The database is SQLite (`masuratori.db`) by default and the tables are created
on startup. To change it, copy `.env.example` to `.env` and set `DATABASE_URL`.

## Counters

Each metering device (one PXR) is a counter with a short `code` such as `aula`
or `corp-a`. Register it once before the reader sends for it:

```powershell
curl -X POST http://localhost:8000/api/counters -H "content-type: application/json" `
  -d '{"code": "aula", "name": "Aula", "rated_current": 100}'
```

`code` is lowercase letters, digits and dashes. `rated_current` (A) is optional.

## Connecting the reader

In the reader's `masuratori_electrice/sender.py`, with the counter's code in the URL:

```python
API_URL = "http://localhost:8000/api/counters/aula/measurements"
```

The body is unchanged: one list per read cycle.

```json
[{"name": "intensity_l1", "raw": 12.5, "unit": "A"}, ...]
```

Posting to a code that was not registered returns 404.

## Endpoints

| method | path | what it does |
|---|---|---|
| POST | `/api/counters` | register a counter |
| GET | `/api/counters` | all counters |
| GET | `/api/counters/{code}` | one counter |
| POST | `/api/counters/{code}/measurements` | store one read cycle for that counter (the reader) |
| GET | `/api/readings/latest?counter=` | the last read cycle, all values |
| GET | `/api/readings?counter=&limit=50&offset=0` | recent cycles, newest first |
| GET | `/api/measurements/{name}?counter=&since=&until=&limit=` | history of one value of one counter, oldest first (for charts) |
| GET | `/api/health` | `{"status": "ok"}` |

`counter` is a counter code. It is optional on `/readings` (all counters when
left out) and required on `/measurements/{name}`. Every reading carries
`counter_id` and `counter` (the code).

`name` is the reader's field name: `intensity_l1..l3`, `voltage_l1..l3`,
`active_energy_combined`. Times are UTC, ISO 8601.

## Layout

```
app/
  main.py               FastAPI app, CORS, table creation
  config.py             settings from env / .env
  db.py                 engine, session, get_session dependency
  models.py             Counter -> Reading (one cycle) -> Measurement (one value)
  schemas.py            request/response bodies
  routers/counters.py   counters, and storing readings for one
  routers/measurements.py  read endpoints, filtered by counter
```
