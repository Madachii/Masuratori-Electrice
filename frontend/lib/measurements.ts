/**
 * Measurement model for the meter readings.
 *
 * The backend reads the meter and sends, for every measurement, the raw integer it read.
 * The frontend only knows what each measurement means: its unit, its scale
 * (`value = raw / scale`) and the physically plausible range used for validation.
 * Register addresses and Modbus decoding are the backend's concern.
 */

// ---------- Types ----------

export type Quantity =
  | 'current' | 'voltage'
  | 'activePower' | 'reactivePower' | 'apparentPower'
  | 'powerFactor' | 'frequency'
  | 'activeEnergy' | 'apparentEnergy';

export type Unit = 'A' | 'V' | 'W' | 'Var' | 'VA' | 'Hz' | 'Wh' | 'VAh' | '';

export type MeasurementId =
  | 'I_L1' | 'I_L2' | 'I_L3' | 'I_G' | 'I_N'
  | 'U_L1L2' | 'U_L2L3' | 'U_L3L1' | 'U_L1N' | 'U_L2N' | 'U_L3N'
  | 'P_ACTIVE' | 'P_REACTIVE' | 'P_APPARENT' | 'PF' | 'FREQ'
  | 'E_ACTIVE_FWD' | 'E_ACTIVE_REV' | 'E_ACTIVE_COMB' | 'E_APPARENT'
  | 'PEAK_ACTIVE' | 'PEAK_REACTIVE' | 'PEAK_APPARENT'
  | 'DEMAND_ACTIVE' | 'DEMAND_REACTIVE' | 'DEMAND_APPARENT';

export type ValidationError =
  | 'not_finite' | 'out_of_range' | 'counter_decreased' | 'cross_check_failed' | 'stale';

/** What the app stores and displays. */
export interface Measurement {
  id: MeasurementId;
  quantity: Quantity;
  unit: Unit;
  raw: number;               // exactly as received from the backend
  value: number | null;      // raw / scale, or null when invalid
  valid: boolean;
  error?: ValidationError;
  timestamp: number;         // ms since epoch
}

/** Static description of one measurement. */
export interface MeasurementDef {
  id: MeasurementId;
  quantity: Quantity;
  unit: Unit;
  scale: number;             // value = raw / scale
  min: number;               // plausible physical limits, in display units (tune per installation)
  max: number;
  monotonic?: boolean;       // energy counters never decrease
}

// ---------- Definitions ----------

const d = (
  id: MeasurementId, quantity: Quantity, unit: Unit,
  scale: number, min: number, max: number, monotonic = false,
): MeasurementDef => ({ id, quantity, unit, scale, min, max, monotonic });

export const MEASUREMENTS: MeasurementDef[] = [
  // Currents, 0.1 A resolution
  d('I_L1', 'current', 'A', 10, 0, 10000),
  d('I_L2', 'current', 'A', 10, 0, 10000),
  d('I_L3', 'current', 'A', 10, 0, 10000),
  d('I_N', 'current', 'A', 10, 0, 10000),
  d('I_G', 'current', 'A', 10, 0, 10000),
  // Voltages, 0.1 V resolution
  d('U_L1N', 'voltage', 'V', 10, 0, 1000),
  d('U_L2N', 'voltage', 'V', 10, 0, 1000),
  d('U_L3N', 'voltage', 'V', 10, 0, 1000),
  d('U_L1L2', 'voltage', 'V', 10, 0, 1000),
  d('U_L2L3', 'voltage', 'V', 10, 0, 1000),
  d('U_L3L1', 'voltage', 'V', 10, 0, 1000),
  // Power, PF, frequency
  d('P_ACTIVE', 'activePower', 'W', 1, -1e8, 1e8),
  d('P_REACTIVE', 'reactivePower', 'Var', 1, -1e8, 1e8),
  d('P_APPARENT', 'apparentPower', 'VA', 1, 0, 1e8),
  d('PF', 'powerFactor', '', 100, -1, 1),
  d('FREQ', 'frequency', 'Hz', 10, 45, 65),
  // Energy counters, Wh resolution
  d('E_ACTIVE_COMB', 'activeEnergy', 'Wh', 1, 0, 1e13, true),
  d('E_ACTIVE_FWD', 'activeEnergy', 'Wh', 1, 0, 1e13, true),
  d('E_ACTIVE_REV', 'activeEnergy', 'Wh', 1, 0, 1e13, true),
  d('E_APPARENT', 'apparentEnergy', 'VAh', 1, 0, 1e13, true),
  // Demand and peak demand
  d('DEMAND_ACTIVE', 'activePower', 'W', 1, 0, 1e8),
  d('DEMAND_REACTIVE', 'reactivePower', 'Var', 1, 0, 1e8),
  d('DEMAND_APPARENT', 'apparentPower', 'VA', 1, 0, 1e8),
  d('PEAK_ACTIVE', 'activePower', 'W', 1, 0, 1e8),
  d('PEAK_REACTIVE', 'reactivePower', 'Var', 1, 0, 1e8),
  d('PEAK_APPARENT', 'apparentPower', 'VA', 1, 0, 1e8),
];

export const DEF_BY_ID = Object.fromEntries(
  MEASUREMENTS.map((m) => [m.id, m]),
) as Record<MeasurementId, MeasurementDef>;

// ---------- Validation ----------

export type Validation = { ok: true } | { ok: false; error: ValidationError };

export function validate(def: MeasurementDef, raw: number, previous?: Measurement): Validation {
  if (!Number.isFinite(raw)) return { ok: false, error: 'not_finite' };
  const value = raw / def.scale;
  if (value < def.min || value > def.max) return { ok: false, error: 'out_of_range' };
  if (def.monotonic && previous?.valid && previous.value !== null && value < previous.value) {
    return { ok: false, error: 'counter_decreased' };
  }
  return { ok: true };
}

export function toMeasurement(
  def: MeasurementDef, raw: number, previous?: Measurement, timestamp = Date.now(),
): Measurement {
  const check = validate(def, raw, previous);
  return {
    id: def.id,
    quantity: def.quantity,
    unit: def.unit,
    raw,
    value: check.ok ? raw / def.scale : null,
    valid: check.ok,
    error: check.ok ? undefined : check.error,
    timestamp,
  };
}

/** Readings older than this are shown as stale. */
export const STALE_AFTER_MS = 15_000;

export function isStale(m: Measurement, now = Date.now()): boolean {
  return now - m.timestamp > STALE_AFTER_MS;
}

// ---------- Cross-checks between measurements ----------

export type Snapshot = Partial<Record<MeasurementId, Measurement>>;

const close = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol * Math.max(Math.abs(a), Math.abs(b), 1);

/** Returns the ids that fail a consistency check (so the UI can flag them). */
export function crossCheck(s: Snapshot): MeasurementId[] {
  const bad: MeasurementId[] = [];
  const v = (id: MeasurementId) => (s[id]?.valid ? s[id]!.value : null);

  // Line-to-line voltage should be about sqrt(3) x phase voltage (10% tolerance)
  const pairs: [MeasurementId, MeasurementId, MeasurementId][] = [
    ['U_L1L2', 'U_L1N', 'U_L2N'], ['U_L2L3', 'U_L2N', 'U_L3N'], ['U_L3L1', 'U_L3N', 'U_L1N'],
  ];
  for (const [ll, a, b] of pairs) {
    const x = v(ll), pa = v(a), pb = v(b);
    if (x !== null && pa !== null && pb !== null && !close(x, Math.sqrt(3) * ((pa + pb) / 2), 0.1)) {
      bad.push(ll);
    }
  }

  // Combined energy = forward + reverse (small tolerance, values are read at slightly different times)
  const c = v('E_ACTIVE_COMB'), f = v('E_ACTIVE_FWD'), r = v('E_ACTIVE_REV');
  if (c !== null && f !== null && r !== null && !close(c, f + r, 0.001)) bad.push('E_ACTIVE_COMB');

  // Apparent power must be >= |active power|
  const p = v('P_ACTIVE'), q = v('P_APPARENT');
  if (p !== null && q !== null && q < Math.abs(p) * 0.99) bad.push('P_APPARENT');

  return bad;
}
