import {
  MEASUREMENTS,
  crossCheck,
  toMeasurement,
  type Snapshot,
} from '@/lib/measurements';
import type { MeterSource } from '@/lib/mock-meter';
import * as React from 'react';

const HISTORY_LENGTH = 90;

export interface MeterState {
  snapshot: Snapshot;
  /** Active power in kW, oldest first, for the trend line. */
  history: number[];
  updatedAt: number | null;
  error: string | null;
}

const EMPTY: MeterState = { snapshot: {}, history: [], updatedAt: null, error: null };

/** Polls `source`, scales and validates every measurement. Starts over when `source` changes. */
export function useMeter(source: MeterSource, intervalMs: number): MeterState {
  const [state, setState] = React.useState<MeterState>(EMPTY);
  // Last VALID reading per measurement, so one bad read doesn't break the monotonic check.
  const lastValid = React.useRef<Snapshot>({});

  React.useEffect(() => {
    let alive = true;
    setState(EMPTY);
    lastValid.current = {};

    const tick = async () => {
      try {
        const frame = await source();
        if (!alive) return;
        const now = Date.now();
        const next: Snapshot = {};

        for (const def of MEASUREMENTS) {
          const raw = frame[def.id];
          if (raw === undefined) continue;
          next[def.id] = toMeasurement(def, raw, lastValid.current[def.id], now);
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
          history:
            p?.valid && p.value !== null
              ? [...prev.history, p.value / 1000].slice(-HISTORY_LENGTH)
              : prev.history,
          updatedAt: now,
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
