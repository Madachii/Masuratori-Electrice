import {
  MEASUREMENTS,
  crossCheck,
  toMeasurement,
  passedBasicChecks,
  type MeasurementId,
  type PreviousReading,
  type Snapshot,
} from '@/lib/measurements';
import type { MeterSource } from '@/lib/source';
import * as React from 'react';

const HISTORY_LENGTH = 90;

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
  // The previous reading of each measurement that made sense on its own; checks over time compare with it.
  const previous = React.useRef<Partial<Record<MeasurementId, PreviousReading>>>({});
  const lastReadAt = React.useRef<number | null>(null);

  React.useEffect(() => {
    let alive = true;
    setState(EMPTY);
    previous.current = {};
    lastReadAt.current = null;

    const tick = async () => {
      try {
        const { frame, readAt } = await source();
        if (!alive) return;

        // The backend repeats the latest reading until the reader sends a new one: nothing to redo.
        if (readAt === lastReadAt.current) {
          setState((prev) => ({ ...prev, polledAt: Date.now(), error: null }));
          return;
        }
        lastReadAt.current = readAt;

        const next: Snapshot = {};
        for (const def of MEASUREMENTS) {
          const item = frame[def.id];
          if (!item) continue;
          const m = toMeasurement(def, item.raw, item.unit, previous.current[def.id], readAt);
          if (passedBasicChecks(m)) previous.current[def.id] = { raw: m.raw, at: readAt };
          next[def.id] = m;
        }
        for (const id of crossCheck(next)) {
          next[id] = { ...next[id]!, valid: false, value: null, error: 'cross_check_failed' };
        }

        const p = next.P_ACTIVE;
        setState((prev) => ({
          snapshot: next,
          history:
            p?.valid && p.value !== null
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
