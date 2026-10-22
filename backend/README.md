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

## Connecting the reader

In the reader's `masuratori_electrice/sender.py`:

```python
API_URL = "http://localhost:8000/api/measurements"
```

It already sends the right format: one list per read cycle.

```json
[{"name": "intensity_l1", "raw": 12.5, "unit": "A"}, ...]
```

## Endpoints

| method | path | what it does |
|---|---|---|
| POST | `/api/measurements` | store one read cycle (the reader) |
| GET | `/api/readings/latest` | the last read cycle, all values |
| GET | `/api/readings?limit=50&offset=0` | recent cycles, newest first |
| GET | `/api/measurements/{name}?since=&until=&limit=` | history of one value, oldest first (for charts) |
| GET | `/api/health` | `{"status": "ok"}` |

`name` is the reader's field name: `intensity_l1..l3`, `voltage_l1..l3`,
`active_energy_combined`. Times are UTC, ISO 8601.

## Layout

```
app/
  main.py               FastAPI app, CORS, table creation
  config.py             settings from env / .env
  db.py                 engine, session, get_session dependency
  models.py             Reading (one cycle) -> Measurement (one value)
  schemas.py            request/response bodies
  routers/measurements.py
```
