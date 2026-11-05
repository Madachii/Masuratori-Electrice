import type { MeasurementId } from '@/lib/measurements';

/** Where a value should sit, for the scales next to it. Values in display units. */
export type Band = {
  min: number; // ends of the scale
  max: number;
  lo: number; // the acceptable band
  hi: number;
  nominal?: number;
  decimals: number;
  /** Completes "În …" / "În afara …": "banda de ±10% față de 230 V (EN 50160)". */
  label: string;
};

const PHASE_V: Band = {
  min: 200,
  max: 260,
  lo: 207,
  hi: 253,
  nominal: 230,
  decimals: 0,
  label: 'banda de ±10% față de 230 V (EN 50160)',
};
const LINE_V: Band = {
  min: 346,
  max: 450,
  lo: 360,
  hi: 440,
  nominal: 400,
  decimals: 0,
  label: 'banda de ±10% față de 400 V',
};

const BANDS: Partial<Record<MeasurementId, Band>> = {
  U_L1N: PHASE_V,
  U_L2N: PHASE_V,
  U_L3N: PHASE_V,
  U_L1L2: LINE_V,
  U_L2L3: LINE_V,
  U_L3L1: LINE_V,
  FREQ: {
    min: 49.8,
    max: 50.2,
    lo: 49.9,
    hi: 50.1,
    nominal: 50,
    decimals: 1,
    label: 'banda de ±0,1 Hz față de 50 Hz',
  },
  PF: { min: 0.8, max: 1, lo: 0.95, hi: 1, decimals: 2, label: 'banda recomandată, peste 0,95' },
};

export const bandFor = (id: MeasurementId) => BANDS[id];

export const inBand = (b: Band, v: number) => v >= b.lo && v <= b.hi;

/** Phase currents are drawn against the meter's rated current. */
export const PHASE_CURRENTS: MeasurementId[] = ['I_L1', 'I_L2', 'I_L3'];

/** The phase a measurement belongs to, if it belongs to just one. */
export function phaseOf(id: MeasurementId): 1 | 2 | 3 | null {
  const m = /^(?:I_L|U_L)([123])N?$/.exec(id);
  return m ? (Number(m[1]) as 1 | 2 | 3) : null;
}
