import { API_URL, fetchSeries, hasSeries } from '@/lib/api';
import { validate, type MeasurementDef } from '@/lib/measurements';
import * as React from 'react';

export type SeriesRange = 'month' | 'quarter' | 'all';

const RANGE_DAYS: Record<SeriesRange, number | null> = { month: 30, quarter: 90, all: null };

export type Series = {
  /** Valid values, oldest first; `at` in ms. */
  points: { at: number; v: number }[];
  /** Stored values that failed the basic checks and were left out of the chart. */
  dropped: number;
  loading: boolean;
  error: string | null;
};

const EMPTY: Series = { points: [], dropped: 0, loading: true, error: null };

/**
 * The history the backend keeps for one measurement. Fetched again when `refreshKey` changes
 * (a new reading arrived), so the chart grows with the meter.
 */
export function useBackendSeries(
  def: MeasurementDef,
  counter: string,
  range: SeriesRange,
  refreshKey: unknown
): Series | null {
  const enabled = !!API_URL && !!counter && hasSeries(def.id);
  // What the stored series was fetched for. When the counter, measurement or range changes it
  // starts over empty, so one counter's history never shows under another; a new reading only
  // refreshes it in place.
  const key = `${counter}|${def.id}|${range}`;
  const [stored, setStored] = React.useState<{ key: string; series: Series }>({ key, series: EMPTY });
  const series = stored.key === key ? stored.series : EMPTY;

  React.useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const days = RANGE_DAYS[range];
    const since = days === null ? null : Date.now() - days * 86_400_000;
    fetchSeries(def.id, counter, since)
      .then((raw) => {
        if (!alive) return;
        // Only the checks on the value itself: the ones over time already ran on each reading.
        const points = raw
          .filter((p) => validate(def, p.raw, p.unit, { at: p.at }).ok)
          .map((p) => ({ at: p.at, v: p.raw }));
        setStored({
          key,
          series: { points, dropped: raw.length - points.length, loading: false, error: null },
        });
      })
      .catch((e) => {
        if (alive)
          setStored((prev) => ({
            key,
            series: {
              ...(prev.key === key ? prev.series : EMPTY),
              loading: false,
              error: e instanceof Error ? e.message : String(e),
            },
          }));
      });
    return () => {
      alive = false;
    };
  }, [enabled, def, counter, range, key, refreshKey]);

  return enabled ? series : null;
}
