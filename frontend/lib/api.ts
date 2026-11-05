/**
 * Readings from the FastAPI backend (backend/ on the app/backend branch).
 *
 * Set EXPO_PUBLIC_API_URL in .env.local, e.g. http://192.168.1.20:8000.
 * On a phone, use the laptop's IP address: "localhost" there is the phone itself.
 * Without it the app has nowhere to read from and shows an error.
 */
import type { MeasurementId } from '@/lib/measurements';
import { DEFAULT_RATED_CURRENT, type Meter } from '@/lib/meters';
import type { MeterSource, RawFrame } from '@/lib/source';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

/**
 * Reader field names (FIELDS in masuratori_electrice/measurements.py, branch app/pxr25) mapped
 * to ours. Units must arrive exactly as in MEASUREMENTS.
 */
const NAME_TO_ID: Record<string, MeasurementId> = {
  // Names of the first reader, still in readings stored before it changed. Listed first, so
  // the current names below are the ones history is fetched under.
  voltage_l1: 'U_L1N',
  voltage_l2: 'U_L2N',
  voltage_l3: 'U_L3N',

  intensity_l1: 'I_L1',
  intensity_l2: 'I_L2',
  intensity_l3: 'I_L3',
  intensity_neutral: 'I_N',
  intensity_ground: 'I_G',
  voltage_l1_n: 'U_L1N',
  voltage_l2_n: 'U_L2N',
  voltage_l3_n: 'U_L3N',
  voltage_l1_l2: 'U_L1L2',
  voltage_l2_l3: 'U_L2L3',
  voltage_l3_l1: 'U_L3L1',
  active_power: 'P_ACTIVE',
  reactive_power: 'P_REACTIVE',
  apparent_power: 'P_APPARENT',
  power_factor: 'PF',
  frequency: 'FREQ',
  active_energy_combined: 'E_ACTIVE_COMB',
  active_energy_forward: 'E_ACTIVE_FWD',
  active_energy_reverse: 'E_ACTIVE_REV',
  apparent_energy: 'E_APPARENT',
  active_power_demand: 'DEMAND_ACTIVE',
  reactive_power_demand: 'DEMAND_REACTIVE',
  apparent_power_demand: 'DEMAND_APPARENT',
  peak_active_power: 'PEAK_ACTIVE',
  peak_reactive_power: 'PEAK_REACTIVE',
  peak_apparent_power: 'PEAK_APPARENT',
};

const ID_TO_NAME = Object.fromEntries(
  Object.entries(NAME_TO_ID).map(([name, id]) => [id, name])
) as Partial<Record<MeasurementId, string>>;

/** Whether the backend keeps a history of this measurement. */
export const hasSeries = (id: MeasurementId) => id in ID_TO_NAME;

const NO_URL = 'Adresa backendului nu este setată (EXPO_PUBLIC_API_URL în .env.local)';

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Backendul a răspuns cu ${response.status}`);
  return response.json();
}

type CounterOut = { id: number; code: string; name: string; rated_current: number | null };

/** The counters the backend knows, in the order it lists them. */
export async function fetchMeters(baseUrl = API_URL): Promise<Meter[]> {
  if (!baseUrl) throw new Error(NO_URL);
  const counters = await getJson<CounterOut[]>(`${baseUrl}/api/counters`);
  return counters.map((c) => ({
    id: c.code,
    name: c.name || c.code,
    ratedCurrent: c.rated_current ?? DEFAULT_RATED_CURRENT,
  }));
}

/** One stored value of a measurement, as the backend returns it. */
export type SeriesPoint = { at: number; raw: number; unit: string };

/** The stored values of one measurement of one counter since `since` (ms), oldest first. */
export async function fetchSeries(
  id: MeasurementId,
  counter: string,
  since: number | null,
  baseUrl = API_URL
): Promise<SeriesPoint[]> {
  const name = ID_TO_NAME[id];
  if (!name) return [];
  const query = new URLSearchParams({ counter, limit: '1000' });
  if (since !== null) query.set('since', new Date(since).toISOString());
  const points = await getJson<{ received_at: string; value: number; unit: string }[]>(
    `${baseUrl}/api/measurements/${name}?${query}`
  );
  return points.map((p) => ({ at: Date.parse(p.received_at), raw: p.value, unit: p.unit }));
}

type ReadingOut = {
  id: number;
  /** The counter's code. */
  counter: string;
  received_at: string;
  measurements: { name: string; value: number; unit: string }[];
};

const toFrame = (reading: ReadingOut) => {
  const frame: RawFrame = {};
  for (const m of reading.measurements) {
    const id = NAME_TO_ID[m.name];
    if (id) frame[id] = { raw: m.value, unit: m.unit };
  }
  return { frame, readAt: Date.parse(reading.received_at) };
};

/** The readings of one counter, by its code. */
export function createApiSource(counter: string, baseUrl = API_URL): MeterSource {
  return async () => {
    if (!baseUrl) throw new Error(NO_URL);
    // The last two cycles, newest first: the one before is what the checks over time compare with.
    const query = new URLSearchParams({ counter, limit: '2' });
    const readings = await getJson<ReadingOut[]>(`${baseUrl}/api/readings?${query}`);

    // A backend that ignores `counter` would hand over every counter's readings mixed together.
    if (readings.some((r) => r.counter !== counter))
      throw new Error('Backendul nu separă citirile pe contoare; actualizează-l');
    const [latest, before] = readings;
    if (!latest) throw new Error('Contorul nu are încă nicio citire');
    return { ...toFrame(latest), previous: before ? toFrame(before) : undefined };
  };
}
