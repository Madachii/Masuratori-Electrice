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

/** One line on what the measurement means, shown in the full list. */
export const DESCRIPTION: Record<MeasurementId, string> = {
  I_L1: 'Curentul prin faza 1',
  I_L2: 'Curentul prin faza 2',
  I_L3: 'Curentul prin faza 3',
  I_N: 'Curentul prin neutru; crește când fazele sunt încărcate inegal',
  I_G: 'Curent scurs spre pământ; o valoare mare indică un defect de izolație',
  U_L1N: 'Tensiunea dintre faza 1 și neutru',
  U_L2N: 'Tensiunea dintre faza 2 și neutru',
  U_L3N: 'Tensiunea dintre faza 3 și neutru',
  U_L1L2: 'Tensiunea dintre fazele 1 și 2',
  U_L2L3: 'Tensiunea dintre fazele 2 și 3',
  U_L3L1: 'Tensiunea dintre fazele 3 și 1',
  P_ACTIVE: 'Puterea consumată efectiv, pe toate cele trei faze',
  P_REACTIVE: 'Putere schimbată cu motoarele și bobinele, fără lucru util',
  P_APPARENT: 'Puterea totală cu care e încărcată instalația',
  PF: 'Putere activă / putere aparentă; ideal cât mai aproape de 1',
  FREQ: 'Frecvența rețelei; nominal 50 Hz',
  E_ACTIVE_COMB: 'Energia activă totală, import + export',
  E_ACTIVE_FWD: 'Energia activă consumată din rețea',
  E_ACTIVE_REV: 'Energia activă livrată înapoi în rețea',
  E_APPARENT: 'Energia aparentă totală',
  DEMAND_ACTIVE: 'Puterea activă medie pe intervalul de cerere',
  DEMAND_REACTIVE: 'Puterea reactivă medie pe intervalul de cerere',
  DEMAND_APPARENT: 'Puterea aparentă medie pe intervalul de cerere',
  PEAK_ACTIVE: 'Cea mai mare cerere activă înregistrată',
  PEAK_REACTIVE: 'Cea mai mare cerere reactivă înregistrată',
  PEAK_APPARENT: 'Cea mai mare cerere aparentă înregistrată',
};

export const ERROR_LABEL: Record<ValidationError, string> = {
  not_finite: 'citire invalidă',
  out_of_range: 'în afara domeniului',
  counter_decreased: 'contor descrescut',
  cross_check_failed: 'inconsistent',
  stale: 'expirat',
};

// Power and energy are stored in base units; show them with a k prefix once they get large.
const KILO: Partial<Record<Unit, string>> = { W: 'kW', Var: 'kvar', VA: 'kVA', Wh: 'kWh', VAh: 'kVAh' };
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
  const decimals = Math.max(0, Math.round(Math.log10(def.scale)));
  return { value: num(m.value, decimals), unit };
}

const pad = (n: number) => String(n).padStart(2, '0');

export const clock = (ms: number) => {
  const t = new Date(ms);
  return `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`;
};
