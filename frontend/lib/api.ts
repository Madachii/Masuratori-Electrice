/**
 * Readings from the FastAPI backend (backend/ on the app/backend branch).
 *
 * Set EXPO_PUBLIC_API_URL in .env.local, e.g. http://192.168.1.20:8000.
 * On a phone, use the laptop's IP address: "localhost" there is the phone itself.
 * When the variable is empty the app falls back to simulated data.
 */
import type { MeasurementId } from '@/lib/measurements';
import type { MeterSource, RawFrame } from '@/lib/source';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

/** Reader field names (masuratori_electrice/measurements.py) mapped to ours. */
const NAME_TO_ID: Record<string, MeasurementId> = {
  intensity_l1: 'I_L1',
  intensity_l2: 'I_L2',
  intensity_l3: 'I_L3',
  voltage_l1: 'U_L1N',
  voltage_l2: 'U_L2N',
  voltage_l3: 'U_L3N',
  active_energy_combined: 'E_ACTIVE_COMB',
};

type ReadingOut = {
  id: number;
  received_at: string;
  measurements: { name: string; value: number; unit: string }[];
};

export function createApiSource(baseUrl = API_URL): MeterSource {
  return async () => {
    const response = await fetch(`${baseUrl}/api/readings/latest`);
    if (response.status === 404) throw new Error('Backendul nu are încă nicio citire');
    if (!response.ok) throw new Error(`Backendul a răspuns cu ${response.status}`);

    const reading: ReadingOut = await response.json();
    const frame: RawFrame = {};
    for (const m of reading.measurements) {
      const id = NAME_TO_ID[m.name];
      if (id) frame[id] = { raw: m.value, unit: m.unit };
    }
    return { frame, readAt: Date.parse(reading.received_at) };
  };
}
