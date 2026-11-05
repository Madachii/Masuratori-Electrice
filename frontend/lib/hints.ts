import type { Measurement, MeasurementId } from '@/lib/measurements';

/** A short verdict shown under a value, e.g. "Foarte bun" under the power factor. */
export type Hint = { text: string; tone: 'ok' | 'warn' | 'bad' };

const valueOf = (m?: Measurement) => (m?.valid && m.value !== null ? m.value : null);

const pfHint = (m?: Measurement): Hint | undefined => {
  const v = valueOf(m);
  if (v === null) return undefined;
  const pf = Math.abs(v);
  return pf >= 0.95
    ? { text: 'Foarte bun', tone: 'ok' }
    : pf >= 0.9
      ? { text: 'Acceptabil', tone: 'warn' }
      : { text: 'Scăzut, consum reactiv mare', tone: 'bad' };
};

const freqHint = (m?: Measurement): Hint | undefined => {
  const v = valueOf(m);
  if (v === null) return undefined;
  return Math.abs(v - 50) <= 0.1
    ? { text: 'În bandă ±0,1 Hz', tone: 'ok' }
    : { text: 'Abatere de la 50 Hz', tone: 'warn' };
};

const HINTS: Partial<Record<MeasurementId, (m?: Measurement) => Hint | undefined>> = {
  PF: pfHint,
  FREQ: freqHint,
};

export const hintFor = (id: MeasurementId, m?: Measurement) => HINTS[id]?.(m);
