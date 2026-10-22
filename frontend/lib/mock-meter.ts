/**
 * Simulated PXR10 for developing the UI without the backend.
 * It returns raw register words, so the app runs the same decode/validate path as with real data.
 * Every few reads it corrupts one register on purpose, to exercise the validation UI.
 */
import { REGISTER_BY_ID, type MeasurementId, type RegisterDef } from '@/lib/measurements';

/** Raw 16-bit words per register, as the backend will return them. */
export type RawFrame = Partial<Record<MeasurementId, number[]>>;
export type MeterSource = () => Promise<RawFrame>;

function toWords(def: RegisterDef, value: number): number[] {
  let n = BigInt(Math.round(value * def.scale));
  const bits = BigInt(def.words * 16);
  if (n < 0n) n += 1n << bits;
  const out: number[] = [];
  for (let k = def.words - 1; k >= 0; k--) out.push(Number((n >> BigInt(k * 16)) & 0xffffn));
  return out;
}

const noise = (amp: number) => (Math.random() * 2 - 1) * amp;

const GLITCHABLE: MeasurementId[] = ['I_L1', 'I_L2', 'I_L3', 'U_L1N', 'U_L2N', 'U_L3N', 'FREQ'];

export function createMockSource(): MeterSource {
  let last = Date.now();
  let whFwd = 18_432_716;
  let vah = 20_118_340;
  let demand: [number, number, number] | null = null;
  let peak: [number, number, number] = [0, 0, 0];

  return async () => {
    const now = Date.now();
    const dt = (now - last) / 1000;
    last = now;
    const t = now / 1000;

    const uN = [0, 2.1, 4.2].map((ph) => 230 + 4 * Math.sin(t / 25 + ph) + noise(0.6));
    const iL = [46, 58, 39].map((base, k) => base * (1 + 0.18 * Math.sin(t / 18 + k)) + noise(1.5));
    const pf = 0.91 + 0.04 * Math.sin(t / 30);

    const s = uN.reduce((acc, u, k) => acc + u * iL[k], 0);
    const p = s * pf;
    const q = Math.sqrt(s * s - p * p);

    // Neutral current = magnitude of the phasor sum of the three phase currents
    const re = iL[0] + iL[1] * Math.cos((2 * Math.PI) / 3) + iL[2] * Math.cos((4 * Math.PI) / 3);
    const im = iL[1] * Math.sin((2 * Math.PI) / 3) + iL[2] * Math.sin((4 * Math.PI) / 3);

    whFwd += (p * dt) / 3600;
    vah += (s * dt) / 3600;
    demand = demand ? [demand[0] * 0.9 + p * 0.1, demand[1] * 0.9 + q * 0.1, demand[2] * 0.9 + s * 0.1] : [p, q, s];
    peak = [Math.max(peak[0], demand[0]), Math.max(peak[1], demand[1]), Math.max(peak[2], demand[2])];

    const ll = (a: number, b: number) => (Math.sqrt(3) * (uN[a] + uN[b])) / 2 + noise(0.4);

    const values: Record<MeasurementId, number> = {
      I_L1: iL[0], I_L2: iL[1], I_L3: iL[2],
      I_G: 0.2 + Math.abs(noise(0.1)),
      I_N: Math.hypot(re, im),
      U_L1L2: ll(0, 1), U_L2L3: ll(1, 2), U_L3L1: ll(2, 0),
      U_L1N: uN[0], U_L2N: uN[1], U_L3N: uN[2],
      P_ACTIVE: p, P_REACTIVE: q, P_APPARENT: s,
      PF: pf,
      FREQ: 50 + 0.03 * Math.sin(t / 10) + noise(0.01),
      E_ACTIVE_FWD_KWH: Math.floor(whFwd / 1000),
      E_ACTIVE_REV_KWH: 0,
      E_ACTIVE_COMB_KWH: Math.floor(whFwd / 1000),
      E_APPARENT_KVAH: Math.floor(vah / 1000),
      E_ACTIVE_FWD_WH: Math.floor(whFwd),
      E_ACTIVE_REV_WH: 0,
      E_ACTIVE_COMB_WH: Math.floor(whFwd),
      E_APPARENT_VAH: Math.floor(vah),
      PEAK_ACTIVE: peak[0], PEAK_REACTIVE: peak[1], PEAK_APPARENT: peak[2],
      DEMAND_ACTIVE: demand[0], DEMAND_REACTIVE: demand[1], DEMAND_APPARENT: demand[2],
    };

    const frame: RawFrame = {};
    for (const [id, value] of Object.entries(values) as [MeasurementId, number][]) {
      frame[id] = toWords(REGISTER_BY_ID[id], value);
    }

    if (Math.random() < 0.08) {
      const id = GLITCHABLE[Math.floor(Math.random() * GLITCHABLE.length)];
      frame[id] = frame[id]!.map(() => 0xffff);
    }

    return frame;
  };
}
