// TODO: load from the backend once it exposes the list of meters.
// For now the backend serves a single meter (LIVE_METER); METERS are shown with simulated data.

export interface Meter {
  id: string;
  name: string;
  ratedCurrent: number; // A, used to scale the current bars
}

export const LOCATION = 'UTCN · Centrul Universitar Nord Baia Mare';

export const LIVE_METER: Meter = { id: 'pxr', name: 'Contor PXR', ratedCurrent: 100 };

export const METERS: Meter[] = [
  { id: 'aula', name: 'Aula', ratedCurrent: 100 },
  { id: 'corp-a', name: 'Corp A', ratedCurrent: 160 },
  { id: 'corp-b', name: 'Corp B', ratedCurrent: 160 },
  { id: 'corp-c-uac', name: 'Corp C - UAC', ratedCurrent: 100 },
  { id: 'corp-e', name: 'Corp E', ratedCurrent: 100 },
  { id: 'litere', name: 'Facultatea de Litere', ratedCurrent: 125 },
  { id: 'ac-aula', name: 'AC exterior Aula', ratedCurrent: 32 },
  { id: 'sala-sport', name: 'Sala de sport', ratedCurrent: 63 },
  { id: 'atelier', name: 'Atelier tâmplărie', ratedCurrent: 63 },
];
