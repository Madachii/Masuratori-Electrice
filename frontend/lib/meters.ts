// TODO: load from the backend once it exposes the list of meters (it stores no device_id yet).
// For now the backend serves a single meter.

export interface Meter {
  id: string;
  name: string;
  ratedCurrent: number; // A, used to scale the current bars
  model?: string;
}

/** Most power a meter can carry: 3 phases × 230 V × rated current, plus 50 % for overload. */
export const maxPowerW = (meter: Meter) => 1.5 * 3 * 230 * meter.ratedCurrent;

export const LOCATION = 'UTCN · Centrul Universitar Nord Baia Mare';

export const LIVE_METER: Meter = { id: 'pxr', name: 'Contor PXR', ratedCurrent: 100, model: 'Eaton PXR25' };
