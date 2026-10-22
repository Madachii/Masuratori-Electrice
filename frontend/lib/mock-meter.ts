/**
 * Simulated backend, for developing the UI without the reader and the backend running.
 * It returns the same shape as the real source: every value with its unit.
 * Unlike the reader it also sends power, frequency and demand, so every part of the UI has data.
 * Every few reads it corrupts one value on purpose, to exercise the validation UI.
 */
import { DEF_BY_ID, type MeasurementId } from '@/lib/measurements';
import type { Meter } from '@/lib/meters';
import type { MeterSource, RawFrame } from '@/lib/source';

const noise = (amp: number) => (Math.random() * 2 - 1) * amp;

/** Stable number in [0, 1) derived from a string, so each meter gets its own profile. */
function seed(text: string) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h % 1000) / 1000;
}

const GLITCHABLE: MeasurementId[] = ['I_L1', 'I_L2', 'I_L3', 'U_L1N', 'U_L2N', 'U_L3N', 'FREQ'];

export function createMockSource(meter: Meter): MeterSource {
  const k = seed(meter.id);
  const load = 0.3 + 0.5 * k; // fraction of the rated current
  let last = Date.now();
  let whFwd = Math.round(2_000_000 + 40_000_000 * k);
  let vah = Math.round(whFwd * 1.09);
  let demand: [number, number, number] | null = null;
  let peak: [number, number, number] = [0, 0, 0];

  return async () => {
    const now = Date.now();
    const dt = (now - last) / 1000;
    last = now;
    const t = now / 1000;

    const uN = [0, 2.1, 4.2].map((ph) => 230 + 4 * Math.sin(t / 25 + ph) + noise(0.6));
    const iL = [1, 1.25, 0.85].map(
      (f, n) => meter.ratedCurrent * load * f * (1 + 0.18 * Math.sin(t / 18 + n)) + noise(0.02 * meter.ratedCurrent),
    );
    const pf = 0.9 + 0.06 * k + 0.03 * Math.sin(t / 30);

    const s = uN.reduce((acc, u, n) => acc + u * iL[n], 0);
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
      E_ACTIVE_FWD: whFwd / 1000,
      E_ACTIVE_REV: 0,
      E_ACTIVE_COMB: whFwd / 1000,
      E_APPARENT: vah / 1000,
      PEAK_ACTIVE: peak[0], PEAK_REACTIVE: peak[1], PEAK_APPARENT: peak[2],
      DEMAND_ACTIVE: demand[0], DEMAND_REACTIVE: demand[1], DEMAND_APPARENT: demand[2],
    };

    const frame: RawFrame = {};
    for (const [id, value] of Object.entries(values) as [MeasurementId, number][]) {
      // Energy keeps Wh resolution, like the meter register; the rest one decimal finer than shown.
      const decimals = DEF_BY_ID[id].quantity.endsWith('Energy') ? 3 : DEF_BY_ID[id].decimals + 1;
      frame[id] = { raw: Number(value.toFixed(decimals)), unit: DEF_BY_ID[id].unit };
    }

    // What a corrupted float read looks like: a huge, meaningless number.
    if (Math.random() < 0.08) {
      const id = GLITCHABLE[Math.floor(Math.random() * GLITCHABLE.length)];
      frame[id] = { ...frame[id]!, raw: 3.4e38 };
    }

    return { frame, readAt: now };
  };
}
