import {
  REGISTER_BY_ID,
  type Measurement,
  type MeasurementId,
  type Unit,
  type ValidationError,
} from '@/lib/measurements';

export const LABEL: Record<MeasurementId, string> = {
  I_L1: 'Curent L1',
  I_L2: 'Curent L2',
  I_L3: 'Curent L3',
  I_G: 'Curent la pământ',
  I_N: 'Curent neutru',
  U_L1L2: 'Tensiune L1–L2',
  U_L2L3: 'Tensiune L2–L3',
  U_L3L1: 'Tensiune L3–L1',
  U_L1N: 'Tensiune L1–N',
  U_L2N: 'Tensiune L2–N',
  U_L3N: 'Tensiune L3–N',
  P_ACTIVE: 'Putere activă',
  P_REACTIVE: 'Putere reactivă',
  P_APPARENT: 'Putere aparentă',
  PF: 'Factor de putere',
  FREQ: 'Frecvență',
  E_ACTIVE_FWD_KWH: 'Energie activă import',
  E_ACTIVE_REV_KWH: 'Energie activă export',
  E_ACTIVE_COMB_KWH: 'Energie activă combinată',
  E_APPARENT_KVAH: 'Energie aparentă',
  E_ACTIVE_FWD_WH: 'Energie activă import',
  E_ACTIVE_REV_WH: 'Energie activă export',
  E_ACTIVE_COMB_WH: 'Energie activă combinată',
  E_APPARENT_VAH: 'Energie aparentă',
  PEAK_ACTIVE: 'Vârf cerere activă',
  PEAK_REACTIVE: 'Vârf cerere reactivă',
  PEAK_APPARENT: 'Vârf cerere aparentă',
  DEMAND_ACTIVE: 'Cerere activă',
  DEMAND_REACTIVE: 'Cerere reactivă',
  DEMAND_APPARENT: 'Cerere aparentă',
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
  const def = REGISTER_BY_ID[m.id];
  const kilo = KILO[m.unit];
  const unit = DISPLAY_UNIT[m.unit] ?? m.unit;
  if (!m.valid || m.value === null) return { value: '—', unit: kilo ?? unit };
  if (kilo && Math.abs(m.value) >= 1000) return { value: num(m.value / 1000, 2), unit: kilo };
  const decimals = Math.max(0, Math.round(Math.log10(def.scale)));
  return { value: num(m.value, decimals), unit };
}

export const hex = (address: number) => '0x' + address.toString(16).toUpperCase().padStart(4, '0');
