import { LoadingContext } from '@/components/meter/reading';
import { useMeter, type MeterState } from '@/hooks/use-meter';
import { createApiSource } from '@/lib/api';
import { LIVE_WITHIN_MS, type MeasurementId } from '@/lib/measurements';
import { LIVE_METER, maxPowerW, type Meter } from '@/lib/meters';
import * as React from 'react';

export const POLL_MS = 5000;
// The backend serves a single meter for now.
export const AVAILABLE_METERS = [LIVE_METER];

type MeterContextValue = {
  meter: Meter;
  setMeter: (meter: Meter) => void;
  readings: MeterState;
  /** Before the first reading values pulse as placeholders; after an error they show dashes. */
  loading: boolean;
  /** The last reading is recent enough to count as live. */
  live: boolean;
  /** What the source sends (the real meter reads only some measurements); null until known. */
  available: Set<MeasurementId> | null;
  /** Measurements in the last reading that failed validation. */
  errors: MeasurementId[];
};

const MeterContext = React.createContext<MeterContextValue | null>(null);

/** Reads the selected meter once for the whole app, so every tab shows the same reading. */
export function MeterProvider({ children }: { children: React.ReactNode }) {
  const [meter, setMeter] = React.useState(AVAILABLE_METERS[0]);
  // One source per meter, so switching meters starts from a clean reading.
  const source = React.useMemo(() => createApiSource(), [meter]);
  const readings = useMeter(source, POLL_MS, maxPowerW(meter));
  const loading = readings.updatedAt === null && !readings.error;
  // Re-evaluated on every poll, which is often enough for the live badge.
  const live =
    readings.updatedAt !== null &&
    !readings.error &&
    Date.now() - readings.updatedAt < LIVE_WITHIN_MS;

  const available = React.useMemo(() => {
    const ids = Object.keys(readings.snapshot) as MeasurementId[];
    return ids.length ? new Set(ids) : null;
  }, [readings.snapshot]);
  const errors = React.useMemo(
    () =>
      Object.values(readings.snapshot)
        .filter((m) => m && !m.valid)
        .map((m) => m!.id),
    [readings.snapshot]
  );

  const value = { meter, setMeter, readings, loading, live, available, errors };
  return (
    <MeterContext.Provider value={value}>
      <LoadingContext.Provider value={loading}>{children}</LoadingContext.Provider>
    </MeterContext.Provider>
  );
}

export function useMeterContext() {
  const ctx = React.useContext(MeterContext);
  if (!ctx) throw new Error('useMeterContext must be used inside MeterProvider');
  return ctx;
}
