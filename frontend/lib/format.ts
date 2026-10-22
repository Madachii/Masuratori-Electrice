import {
  DEF_BY_ID,
  type Measurement,
  type MeasurementId,
  type Unit,
  type ValidationError,
} from '@/lib/measurements';

export const LABEL: Record<MeasurementId, string> = {
  I_L1: 'Curent L1',
  I_L2: 'Curent L2',
  I_L3: 'Curent L3',
  I_N: 'Curent neutru',
  I_G: 'Curent la pământ',
  U_L1N: 'Tensiune L1–N',
  U_L2N: 'Tensiune L2–N',
  U_L3N: 'Tensiune L3–N',
  U_L1L2: 'Tensiune L1–L2',
  U_L2L3: 'Tensiune L2–L3',
  U_L3L1: 'Tensiune L3–L1',
  P_ACTIVE: 'Putere activă',
  P_REACTIVE: 'Putere reactivă',
  P_APPARENT: 'Putere aparentă',
  PF: 'Factor de putere',
  FREQ: 'Frecvență',
  E_ACTIVE_COMB: 'Energie activă combinată',
  E_ACTIVE_FWD: 'Energie activă import',
  E_ACTIVE_REV: 'Energie activă export',
  E_APPARENT: 'Energie aparentă',
  DEMAND_ACTIVE: 'Cerere activă',
  DEMAND_REACTIVE: 'Cerere reactivă',
  DEMAND_APPARENT: 'Cerere aparentă',
  PEAK_ACTIVE: 'Vârf cerere activă',
  PEAK_REACTIVE: 'Vârf cerere reactivă',
  PEAK_APPARENT: 'Vârf cerere aparentă',
};

/** One line on what the measurement means, only where the name alone isn't enough. */
export const DESCRIPTION: Partial<Record<MeasurementId, string>> = {
  I_N: 'Crește când fazele sunt încărcate inegal',
  I_G: 'Curent scurs spre pământ; o valoare mare indică un defect de izolație',
  P_REACTIVE: 'Schimbată cu motoarele și bobinele, fără lucru util',
  P_APPARENT: 'Încărcarea totală a instalației',
  PF: 'Activă / aparentă; ideal cât mai aproape de 1',
  E_ACTIVE_COMB: 'Import + export',
  E_ACTIVE_REV: 'Livrată înapoi în rețea',
};

export const ERROR_LABEL: Record<ValidationError, string> = {
  not_finite: 'citire invalidă',
  wrong_unit: 'unitate greșită',
  out_of_range: 'în afara domeniului',
  counter_decreased: 'contor descrescut',
  cross_check_failed: 'inconsistent',
  stale: 'expirat',
};

// Power arrives in W; show it with a k prefix once it gets large.
const KILO: Partial<Record<Unit, string>> = { W: 'kW', Var: 'kvar', VA: 'kVA' };
const DISPLAY_UNIT: Partial<Record<Unit, string>> = { Var: 'var' };

/** Romanian decimal comma. */
export const num = (v: number, decimals: number) => v.toFixed(decimals).replace('.', ',');

export function display(m: Measurement | undefined): { value: string; unit: string } {
  if (!m) return { value: '—', unit: '' };
  const def = DEF_BY_ID[m.id];
  const kilo = KILO[m.unit];
  const unit = DISPLAY_UNIT[m.unit] ?? m.unit;
  if (!m.valid || m.value === null) return { value: '—', unit: kilo ?? unit };
  if (kilo && Math.abs(m.value) >= 1000) return { value: num(m.value / 1000, 2), unit: kilo };
  return { value: num(m.value, def.decimals), unit };
}

const pad = (n: number) => String(n).padStart(2, '0');

export const clock = (ms: number) => {
  const t = new Date(ms);
  return `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`;
};
