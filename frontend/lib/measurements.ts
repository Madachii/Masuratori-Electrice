/**
 * Measurement model for the Eaton PXR10 trip unit.
 * Source: PXR manual MN012005EN, Modbus register map, Table 24 (printed page 53).
 *
 * We use the FIXED-POINT registers (0x18xx) for everything: they are plain integers,
 * so `raw` is exactly what was read and `value = raw / scale`.
 * Energy exists ONLY in fixed point, which is another reason to use it everywhere.
 *
 * Items marked VERIFY are inferred from the register spacing in the table and must be
 * checked against the Modbus sections of the manual (pages 53-56) before going live.
 */

// ---------- Types ----------

export type Quantity =
  | 'current' | 'voltage'
  | 'activePower' | 'reactivePower' | 'apparentPower'
  | 'powerFactor' | 'frequency'
  | 'activeEnergy' | 'apparentEnergy';

export type Unit = 'A' | 'V' | 'W' | 'Var' | 'VA' | 'Hz' | 'Wh' | 'kWh' | 'VAh' | 'kVAh' | '';

export type MeasurementId =
  | 'I_L1' | 'I_L2' | 'I_L3' | 'I_G' | 'I_N'
  | 'U_L1L2' | 'U_L2L3' | 'U_L3L1' | 'U_L1N' | 'U_L2N' | 'U_L3N'
  | 'P_ACTIVE' | 'P_REACTIVE' | 'P_APPARENT' | 'PF' | 'FREQ'
  | 'E_ACTIVE_FWD_KWH' | 'E_ACTIVE_REV_KWH' | 'E_ACTIVE_COMB_KWH' | 'E_APPARENT_KVAH'
  | 'E_ACTIVE_FWD_WH' | 'E_ACTIVE_REV_WH' | 'E_ACTIVE_COMB_WH' | 'E_APPARENT_VAH'
  | 'PEAK_ACTIVE' | 'PEAK_REACTIVE' | 'PEAK_APPARENT'
  | 'DEMAND_ACTIVE' | 'DEMAND_REACTIVE' | 'DEMAND_APPARENT';

export type ValidationError =
  | 'not_finite' | 'out_of_range' | 'counter_decreased' | 'cross_check_failed' | 'stale';

/** What the app stores and displays. */
export interface Measurement {
  id: MeasurementId;
  quantity: Quantity;
  unit: Unit;
  raw: number;               // exactly as read from the register(s)
  value: number | null;      // raw / scale, or null when invalid
  valid: boolean;
  error?: ValidationError;
  timestamp: number;         // ms since epoch
}

/** Static description of one register (one row of Table 24). */
export interface RegisterDef {
  id: MeasurementId;
  label: string;
  quantity: Quantity;
  unit: Unit;
  address: number;           // fixed-point register address (hex in the manual)
  scale: number;             // value = raw / scale
  words: 1 | 2 | 4;          // 16-bit registers occupied (VERIFY: inferred from spacing)
  signed: boolean;           // VERIFY: power and PF can be negative (reverse flow)
  min: number;               // plausible physical limits, in display units (tune per installation)
  max: number;
  monotonic?: boolean;       // energy counters never decrease
}

// ---------- Register map (Table 24) ----------

const r = (
  id: MeasurementId, label: string, quantity: Quantity, unit: Unit,
  address: number, scale: number, min: number, max: number,
  opts: Partial<Pick<RegisterDef, 'words' | 'signed' | 'monotonic'>> = {},
): RegisterDef => ({
  id, label, quantity, unit, address, scale, min, max,
  words: 2, signed: false, ...opts,
});

export const REGISTERS: RegisterDef[] = [
  // Currents, 0.1 A resolution
  r('I_L1', 'Current L1', 'current', 'A', 0x1802, 10, 0, 10000),
  r('I_L2', 'Current L2', 'current', 'A', 0x1804, 10, 0, 10000),
  r('I_L3', 'Current L3', 'current', 'A', 0x1806, 10, 0, 10000),
  r('I_G', 'Current ground', 'current', 'A', 0x1808, 10, 0, 10000),
  r('I_N', 'Current neutral', 'current', 'A', 0x180a, 10, 0, 10000),
  // Voltages, 0.1 V resolution
  r('U_L1L2', 'Voltage L1-L2', 'voltage', 'V', 0x180e, 10, 0, 1000),
  r('U_L2L3', 'Voltage L2-L3', 'voltage', 'V', 0x1810, 10, 0, 1000),
  r('U_L3L1', 'Voltage L3-L1', 'voltage', 'V', 0x1812, 10, 0, 1000),
  r('U_L1N', 'Voltage L1-N', 'voltage', 'V', 0x1816, 10, 0, 1000),
  r('U_L2N', 'Voltage L2-N', 'voltage', 'V', 0x1818, 10, 0, 1000),
  r('U_L3N', 'Voltage L3-N', 'voltage', 'V', 0x181a, 10, 0, 1000),
  // Power, PF, frequency
  r('P_ACTIVE', 'Active power (3-phase)', 'activePower', 'W', 0x182a, 1, -1e8, 1e8, { signed: true }),
  r('P_REACTIVE', 'Reactive power (3-phase)', 'reactivePower', 'Var', 0x182c, 1, -1e8, 1e8, { signed: true }),
  r('P_APPARENT', 'Apparent power (3-phase)', 'apparentPower', 'VA', 0x182e, 1, 0, 1e8),
  r('PF', 'Power factor', 'powerFactor', '', 0x1832, 100, -1, 1, { signed: true }),
  r('FREQ', 'Frequency', 'frequency', 'Hz', 0x1834, 10, 45, 65),
  // Energy, kWh/kVAh registers
  r('E_ACTIVE_FWD_KWH', 'Active energy forward', 'activeEnergy', 'kWh', 0x1872, 1, 0, 1e10, { monotonic: true }),
  r('E_ACTIVE_REV_KWH', 'Active energy reverse', 'activeEnergy', 'kWh', 0x1874, 1, 0, 1e10, { monotonic: true }),
  r('E_ACTIVE_COMB_KWH', 'Active energy combined', 'activeEnergy', 'kWh', 0x1876, 1, 0, 1e10, { monotonic: true }),
  r('E_APPARENT_KVAH', 'Apparent energy', 'apparentEnergy', 'kVAh', 0x187e, 1, 0, 1e10, { monotonic: true }),
  // Energy, Wh/VAh registers (finer resolution, 4 words = 64-bit, VERIFY)
  r('E_ACTIVE_FWD_WH', 'Active energy forward', 'activeEnergy', 'Wh', 0x18a0, 1, 0, 1e13, { words: 4, monotonic: true }),
  r('E_ACTIVE_REV_WH', 'Active energy reverse', 'activeEnergy', 'Wh', 0x18a4, 1, 0, 1e13, { words: 4, monotonic: true }),
  r('E_ACTIVE_COMB_WH', 'Active energy combined', 'activeEnergy', 'Wh', 0x18a8, 1, 0, 1e13, { words: 4, monotonic: true }),
  r('E_APPARENT_VAH', 'Apparent energy', 'apparentEnergy', 'VAh', 0x18b8, 1, 0, 1e13, { words: 4, monotonic: true }),
  // Peak and demand
  r('PEAK_ACTIVE', 'Peak active demand', 'activePower', 'W', 0x1858, 1, 0, 1e8),
  r('PEAK_REACTIVE', 'Peak reactive demand', 'reactivePower', 'Var', 0x18bc, 1, 0, 1e8),
  r('PEAK_APPARENT', 'Peak apparent demand', 'apparentPower', 'VA', 0x18be, 1, 0, 1e8),
  r('DEMAND_ACTIVE', 'Active power demand', 'activePower', 'W', 0x18ec, 1, 0, 1e8),
  r('DEMAND_REACTIVE', 'Reactive power demand', 'reactivePower', 'Var', 0x18ee, 1, 0, 1e8),
  r('DEMAND_APPARENT', 'Apparent power demand', 'apparentPower', 'VA', 0x18f0, 1, 0, 1e8),
];

export const REGISTER_BY_ID = Object.fromEntries(
  REGISTERS.map((d) => [d.id, d]),
) as Record<MeasurementId, RegisterDef>;

// ---------- Decoding (VERIFY word order: assumed high word first) ----------

export function decodeRaw(words: number[], def: RegisterDef): number {
  if (words.length !== def.words) return NaN;
  let acc = 0n;
  for (const w of words) acc = (acc << 16n) | BigInt(w & 0xffff);
  if (def.signed) {
    const bits = BigInt(def.words * 16);
    if (acc >= 1n << (bits - 1n)) acc -= 1n << bits;
  }
  return Number(acc);
}

// ---------- Validation ----------

export type Validation = { ok: true } | { ok: false; error: ValidationError };

export function validate(def: RegisterDef, raw: number, previous?: Measurement): Validation {
  if (!Number.isFinite(raw)) return { ok: false, error: 'not_finite' };
  const value = raw / def.scale;
  if (value < def.min || value > def.max) return { ok: false, error: 'out_of_range' };
  if (def.monotonic && previous?.valid && previous.value !== null && value < previous.value) {
    return { ok: false, error: 'counter_decreased' };
  }
  return { ok: true };
}

export function toMeasurement(
  def: RegisterDef, raw: number, previous?: Measurement, timestamp = Date.now(),
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
export const STALE_AFTER_MS = 10_000;

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

  // Combined energy = forward + reverse (small tolerance, registers are read at slightly different times)
  const sets: [MeasurementId, MeasurementId, MeasurementId][] = [
    ['E_ACTIVE_COMB_KWH', 'E_ACTIVE_FWD_KWH', 'E_ACTIVE_REV_KWH'],
    ['E_ACTIVE_COMB_WH', 'E_ACTIVE_FWD_WH', 'E_ACTIVE_REV_WH'],
  ];
  for (const [c, f, rev] of sets) {
    const vc = v(c), vf = v(f), vr = v(rev);
    if (vc !== null && vf !== null && vr !== null && !close(vc, vf + vr, 0.001)) bad.push(c);
  }

  // Apparent power must be >= |active power|
  const p = v('P_ACTIVE'), q = v('P_APPARENT');
  if (p !== null && q !== null && q < Math.abs(p) * 0.99) bad.push('P_APPARENT');

  return bad;
}

// ---------- Display ----------

export function formatMeasurement(m: Measurement): string {
  if (!m.valid || m.value === null) return '--';
  const decimals = Math.max(0, Math.round(Math.log10(REGISTER_BY_ID[m.id].scale)));
  return `${m.value.toFixed(decimals)}${m.unit ? ' ' + m.unit : ''}`;
}