/** One metering device, as the backend lists it in /api/counters. */
export interface Meter {
  /** The counter's code in the backend (e.g. `aula`); every request for its readings uses it. */
  id: string;
  name: string;
  ratedCurrent: number; // A, used to scale the current bars
  model?: string;
}

/** Used when the backend has no rated current for a counter. */
export const DEFAULT_RATED_CURRENT = 100;

/** Most power a meter can carry: 3 phases × 230 V × rated current, plus 50 % for overload. */
export const maxPowerW = (meter: Meter) => 1.5 * 3 * 230 * meter.ratedCurrent;

export const LOCATION = 'UTCN · Centrul Universitar Nord Baia Mare';
