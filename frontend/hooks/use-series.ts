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
  range: SeriesRange,
  refreshKey: unknown
): Series | null {
  const enabled = !!API_URL && hasSeries(def.id);
  const [series, setSeries] = React.useState<Series>(EMPTY);

  // Start over when the measurement or range changes; a new reading only refreshes in place.
  React.useEffect(() => setSeries(EMPTY), [def.id, range]);

  React.useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const days = RANGE_DAYS[range];
    const since = days === null ? null : Date.now() - days * 86_400_000;
    fetchSeries(def.id, since)
      .then((raw) => {
        if (!alive) return;
        // Only the checks on the value itself: the ones over time already ran on each reading.
        const points = raw
          .filter((p) => validate(def, p.raw, p.unit, { at: p.at }).ok)
          .map((p) => ({ at: p.at, v: p.raw }));
        setSeries({ points, dropped: raw.length - points.length, loading: false, error: null });
      })
      .catch((e) => {
        if (alive)
          setSeries((prev) => ({
            ...prev,
            loading: false,
            error: e instanceof Error ? e.message : String(e),
          }));
      });
    return () => {
      alive = false;
    };
  }, [enabled, def, range, refreshKey]);

  return enabled ? series : null;
}
