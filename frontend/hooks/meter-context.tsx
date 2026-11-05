import { LoadingContext } from '@/components/meter/reading';
import { useMeter, type MeterState } from '@/hooks/use-meter';
import { createApiSource, fetchMeters } from '@/lib/api';
import { LIVE_WITHIN_MS, type MeasurementId } from '@/lib/measurements';
import { DEFAULT_RATED_CURRENT, maxPowerW, type Meter } from '@/lib/meters';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';

export const POLL_MS = 5000;
/** How often the list of counters is asked for again, so a newly added one shows up. */
const METERS_POLL_MS = 30_000;
/** Where the chosen counter is kept, so the app opens on it after a restart. */
const SELECTED_KEY = 'meter.selected';

/** Shown until the backend has said which counters there are. */
const PENDING_METER: Meter = { id: '', name: 'Contor', ratedCurrent: DEFAULT_RATED_CURRENT };

type MeterContextValue = {
  /** The counter being shown; a placeholder until the list of counters arrives. */
  meter: Meter;
  /** Every counter the backend knows; empty until the list arrives. */
  meters: Meter[];
  setMeter: (meter: Meter) => void;
  /** The readings of `meter` only. */
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

/** The counters the backend knows, asked for again now and then. */
function useMeterList() {
  const [state, setState] = React.useState<{ meters: Meter[] | null; error: string | null }>({
    meters: null,
    error: null,
  });

  React.useEffect(() => {
    let alive = true;
    const load = () =>
      fetchMeters()
        .then((meters) => alive && setState({ meters, error: null }))
        .catch(
          (e) =>
            // Keep a list we already have; a failed refresh shows up in the readings anyway.
            alive &&
            setState((prev) => ({
              meters: prev.meters,
              error: e instanceof Error ? e.message : String(e),
            }))
        );
    load();
    const id = setInterval(load, METERS_POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return state;
}

/** The code of the counter chosen last time; undefined until read from the device. */
function useSavedMeterId() {
  const [saved, setSaved] = React.useState<string | null | undefined>(undefined);

  React.useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(SELECTED_KEY)
      .then((id) => alive && setSaved(id))
      .catch(() => alive && setSaved(null));
    return () => {
      alive = false;
    };
  }, []);

  const save = React.useCallback((id: string) => {
    setSaved(id);
    AsyncStorage.setItem(SELECTED_KEY, id).catch(() => {
      // Storage unavailable (private browsing): the choice still holds for this session.
    });
  }, []);

  return [saved, save] as const;
}

/** Reads the selected meter once for the whole app, so every tab shows the same reading. */
export function MeterProvider({ children }: { children: React.ReactNode }) {
  const list = useMeterList();
  const [savedId, saveId] = useSavedMeterId();

  const meters = list.meters ?? [];
  // Wait for the saved choice too, so the app does not start on the first counter and then jump.
  const selected =
    savedId === undefined ? null : (meters.find((m) => m.id === savedId) ?? meters[0] ?? null);
  const meter = selected ?? PENDING_METER;

  const selectedId = selected?.id;
  const source = React.useMemo(
    () => (selectedId ? createApiSource(selectedId) : null),
    [selectedId]
  );
  const polled = useMeter(source, POLL_MS, maxPowerW(meter));

  // Without a counter there is nothing to read: say why instead of loading forever.
  const listError = list.meters
    ? list.meters.length === 0
      ? 'Backendul nu are încă niciun contor'
      : null
    : list.error;
  const readings = polled.error || !listError ? polled : { ...polled, error: listError };

  const loading = readings.updatedAt === null && !readings.error;
  // Live when the reading was recent at the last poll; polls come often enough for the badge.
  const live =
    readings.updatedAt !== null &&
    readings.polledAt !== null &&
    !readings.error &&
    readings.polledAt - readings.updatedAt < LIVE_WITHIN_MS;

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

  const setMeter = React.useCallback((m: Meter) => saveId(m.id), [saveId]);

  const value = { meter, meters, setMeter, readings, loading, live, available, errors };
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
