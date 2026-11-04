/**
 * The dashboard as data: an ordered list of modules the user can add, remove, reorder and
 * change. Modules only display the snapshot; reading and validation stay in useMeter.
 */
import { DEF_BY_ID, type MeasurementId } from '@/lib/measurements';

// ---------- Modules ----------

/** Modules that draw a fixed set of measurements in their own way. */
export type FixedModuleType = 'energy' | 'power' | 'phases' | 'list';

export type DashboardModule =
  | { key: string; type: FixedModuleType }
  /** A titled group of measurements the user picks. */
  | { key: string; type: 'stats'; title: string; ids: MeasurementId[] };

export type ModuleType = DashboardModule['type'];

export const MODULE_TITLE: Record<FixedModuleType, string> = {
  energy: 'Contor de energie',
  power: 'Putere activă',
  phases: 'Faze',
  list: 'Toate mărimile',
};

export const MODULE_DESCRIPTION: Record<FixedModuleType, string> = {
  energy: 'Energia combinată ca pe cadranul contorului, cu import, export și aparentă',
  power: 'Puterea instantanee cu tendința recentă, cererea și vârful',
  phases: 'Tensiunea și curentul pe fiecare fază, față de valorile nominale',
  list: 'Fiecare mărime cu explicația ei și rezultatul validării',
};

export const moduleTitle = (m: DashboardModule) =>
  m.type === 'stats' ? m.title : MODULE_TITLE[m.type];

/** Short ids are enough: they only need to be unique within one layout. */
export const newKey = (type: ModuleType) =>
  `${type}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ---------- Measurement groups ----------

export type MeasurementGroup = { title: string; note?: string; ids: MeasurementId[] };

/** Measurements by kind; the full list and the measurement picker both use these. */
export const MEASUREMENT_GROUPS: MeasurementGroup[] = [
  { title: 'Curenți', ids: ['I_L1', 'I_L2', 'I_L3', 'I_N', 'I_G'] },
  { title: 'Tensiuni', ids: ['U_L1N', 'U_L2N', 'U_L3N', 'U_L1L2', 'U_L2L3', 'U_L3L1'] },
  { title: 'Putere și rețea', ids: ['P_ACTIVE', 'P_REACTIVE', 'P_APPARENT', 'PF', 'FREQ'] },
  { title: 'Energie', ids: ['E_ACTIVE_COMB', 'E_ACTIVE_FWD', 'E_ACTIVE_REV', 'E_APPARENT'] },
  {
    title: 'Cerere',
    note: 'Media pe intervalul de cerere și cea mai mare valoare înregistrată',
    ids: [
      'DEMAND_ACTIVE',
      'DEMAND_REACTIVE',
      'DEMAND_APPARENT',
      'PEAK_ACTIVE',
      'PEAK_REACTIVE',
      'PEAK_APPARENT',
    ],
  },
];

// ---------- Layouts ----------

export const LAYOUT_VERSION = 1;

export type DashboardLayout = {
  version: typeof LAYOUT_VERSION;
  /** The preset the layout started from; null once the user changes it. */
  preset: PresetId | null;
  modules: DashboardModule[];
};

const fixed = (type: FixedModuleType): DashboardModule => ({ key: type, type });
const stats = (key: string, title: string, ids: MeasurementId[]): DashboardModule => ({
  key,
  type: 'stats',
  title,
  ids,
});

export type PresetId = 'general' | 'technician' | 'consumption';

export const PRESETS: {
  id: PresetId;
  title: string;
  description: string;
  modules: DashboardModule[];
}[] = [
  {
    id: 'general',
    title: 'Prezentare generală',
    description: 'Energie, putere, faze și starea rețelei',
    modules: [
      fixed('energy'),
      fixed('power'),
      fixed('phases'),
      stats('network', 'Rețea', ['PF', 'FREQ', 'P_REACTIVE', 'P_APPARENT', 'I_N', 'I_G']),
      fixed('list'),
    ],
  },
  {
    id: 'technician',
    title: 'Tehnician',
    description: 'Faze, tensiuni de linie, dezechilibru și calitatea energiei',
    modules: [
      fixed('phases'),
      stats('line-voltages', 'Tensiuni de linie', ['U_L1L2', 'U_L2L3', 'U_L3L1']),
      stats('quality', 'Calitatea energiei', ['PF', 'FREQ', 'I_N', 'I_G']),
      stats('powers', 'Puteri', ['P_ACTIVE', 'P_REACTIVE', 'P_APPARENT']),
      fixed('list'),
    ],
  },
  {
    id: 'consumption',
    title: 'Consum',
    description: 'Energie importată și exportată, cerere și vârfuri',
    modules: [
      fixed('energy'),
      fixed('power'),
      stats('energy-split', 'Energie', ['E_ACTIVE_FWD', 'E_ACTIVE_REV', 'E_APPARENT']),
      stats('demand', 'Cerere', ['DEMAND_ACTIVE', 'DEMAND_REACTIVE', 'DEMAND_APPARENT']),
      stats('peaks', 'Vârfuri de cerere', ['PEAK_ACTIVE', 'PEAK_REACTIVE', 'PEAK_APPARENT']),
    ],
  },
];

export const presetLayout = (id: PresetId): DashboardLayout => ({
  version: LAYOUT_VERSION,
  preset: id,
  modules: PRESETS.find((p) => p.id === id)!.modules,
});

export const DEFAULT_LAYOUT = presetLayout('general');

// ---------- Loading a saved layout ----------

const FIXED_TYPES: FixedModuleType[] = ['energy', 'power', 'phases', 'list'];

/**
 * Turns whatever was saved into a usable layout. Unknown modules and measurements are dropped,
 * so a layout saved by an older or newer version of the app never breaks the screen.
 */
export function parseLayout(input: unknown): DashboardLayout {
  if (!input || typeof input !== 'object') return DEFAULT_LAYOUT;
  const { version, preset, modules } = input as Partial<DashboardLayout>;
  if (version !== LAYOUT_VERSION || !Array.isArray(modules)) return DEFAULT_LAYOUT;

  const keys = new Set<string>();
  const clean: DashboardModule[] = [];
  for (const m of modules as unknown[]) {
    if (!m || typeof m !== 'object') continue;
    const { key, type } = m as { key?: unknown; type?: unknown };
    if (typeof key !== 'string' || keys.has(key)) continue;
    if (FIXED_TYPES.includes(type as FixedModuleType)) {
      clean.push({ key, type: type as FixedModuleType });
    } else if (type === 'stats') {
      const { title, ids } = m as { title?: unknown; ids?: unknown };
      if (typeof title !== 'string' || !Array.isArray(ids)) continue;
      const known = ids.filter(
        (id): id is MeasurementId => typeof id === 'string' && id in DEF_BY_ID
      );
      clean.push({ key, type: 'stats', title, ids: [...new Set(known)] });
    } else {
      continue;
    }
    keys.add(key);
  }
  const validPreset = PRESETS.some((p) => p.id === preset) ? (preset as PresetId) : null;
  return { version: LAYOUT_VERSION, preset: validPreset, modules: clean };
}
