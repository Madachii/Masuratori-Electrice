import {
  MEASUREMENTS,
  crossCheck,
  toMeasurement,
  type MeasurementId,
  type Snapshot,
} from '@/lib/measurements';
import type { MeterSource } from '@/lib/source';
import * as React from 'react';

const HISTORY_LENGTH = 90;
/** After this many new readings in a row below the last valid one, trust the new values. */
const RESET_AFTER_DECREASES = 3;

export interface MeterState {
  snapshot: Snapshot;
  /** Active power in kW, oldest first, for the trend line. */
  history: number[];
  /** When the meter was read (from the source). */
  updatedAt: number | null;
  /** When we last asked the source, successfully; the countdown to the next poll starts here. */
  polledAt: number | null;
  error: string | null;
}

const EMPTY: MeterState = { snapshot: {}, history: [], updatedAt: null, polledAt: null, error: null };

/** Polls `source` and validates every measurement. Starts over when `source` changes. */
export function useMeter(source: MeterSource, intervalMs: number): MeterState {
  const [state, setState] = React.useState<MeterState>(EMPTY);
  // Last VALID reading per measurement, so one bad read doesn't break the monotonic check.
  const lastValid = React.useRef<Snapshot>({});
  // Consecutive new readings that came in below the last valid value, per counter.
  const decreases = React.useRef<Partial<Record<MeasurementId, number>>>({});
  const lastReadAt = React.useRef<number | null>(null);

  React.useEffect(() => {
    let alive = true;
    setState(EMPTY);
    lastValid.current = {};
    decreases.current = {};
    lastReadAt.current = null;

    const tick = async () => {
      try {
        const { frame, readAt } = await source();
        if (!alive) return;
        const next: Snapshot = {};
        // The backend repeats the latest reading until a new one arrives; only new ones count.
        const isNew = readAt !== lastReadAt.current;
        lastReadAt.current = readAt;

        for (const def of MEASUREMENTS) {
          const item = frame[def.id];
          if (!item) continue;
          let m = toMeasurement(def, item.raw, item.unit, lastValid.current[def.id], readAt);
          if (m.error === 'counter_decreased') {
            const count = (decreases.current[def.id] ?? 0) + (isNew ? 1 : 0);
            decreases.current[def.id] = count;
            // Several lower readings in a row: the earlier, higher value was the bad one.
            if (count >= RESET_AFTER_DECREASES) {
              m = toMeasurement(def, item.raw, item.unit, undefined, readAt);
              decreases.current[def.id] = 0;
            }
          } else {
            decreases.current[def.id] = 0;
          }
          next[def.id] = m;
        }
        for (const id of crossCheck(next)) {
          next[id] = { ...next[id]!, valid: false, value: null, error: 'cross_check_failed' };
        }
        for (const m of Object.values(next)) {
          if (m.valid) lastValid.current[m.id] = m;
        }

        const p = next.P_ACTIVE;
        setState((prev) => ({
          snapshot: next,
          // The backend returns the same reading until the reader sends a new one; count it once.
          history:
            readAt !== prev.updatedAt && p?.valid && p.value !== null
              ? [...prev.history, p.value / 1000].slice(-HISTORY_LENGTH)
              : prev.history,
          updatedAt: readAt,
          polledAt: Date.now(),
          error: null,
        }));
      } catch (e) {
        if (alive) setState((prev) => ({ ...prev, error: e instanceof Error ? e.message : String(e) }));
      }
    };

    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [source, intervalMs]);

  return state;
}

/** Re-renders every `ms` so time labels stay current. */
export function useNow(ms = 1000) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
