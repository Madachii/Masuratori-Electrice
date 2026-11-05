import {
  DEFAULT_LAYOUT,
  PRESETS,
  moduleTitle,
  parseLayout,
  presetLayout,
  type DashboardLayout,
  type DashboardModule,
  type PresetId,
} from '@/lib/dashboard';
import type { MeasurementId } from '@/lib/measurements';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';

const STORAGE_KEY = 'dashboard.layout';

/** A change that can be taken back from the toast. */
export type Undo = { id: number; message: string; previous: DashboardLayout };

/**
 * The user's dashboard layout, kept on the device (localStorage on the web) so it survives
 * restarts. Until the saved layout is loaded the default one is shown and nothing is saved.
 */
export function useDashboardLayout() {
  const [layout, setLayout] = React.useState<DashboardLayout>(DEFAULT_LAYOUT);
  const [loaded, setLoaded] = React.useState(false);
  const [undo, setUndo] = React.useState<Undo | null>(null);
  // The latest layout for the actions below, so they never act on a stale render.
  const current = React.useRef(layout);
  const lastUndo = React.useRef(undo);
  React.useEffect(() => {
    current.current = layout;
    lastUndo.current = undo;
  }, [layout, undo]);

  React.useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (alive && saved) setLayout(parseLayout(JSON.parse(saved)));
      })
      .catch(() => {
        // Unreadable or corrupt: keep the default layout; the next change overwrites it.
      })
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(layout)).catch(() => {
      // Storage full or unavailable (private browsing): the layout still works for this session.
    });
  }, [layout, loaded]);

  const actions = React.useMemo(() => {
    /** Changes the modules; any manual change detaches the layout from its preset. */
    const change = (
      fn: (modules: DashboardModule[]) => DashboardModule[],
      undoMessage?: string
    ) => {
      const previous = current.current;
      if (undoMessage) setUndo({ id: Date.now(), message: undoMessage, previous });
      setLayout((l) => ({ ...l, preset: null, modules: fn(l.modules) }));
    };

    const updateStats = (key: string, fn: (ids: MeasurementId[]) => MeasurementId[]) =>
      change((ms) =>
        ms.map((m) => (m.key === key && m.type === 'stats' ? { ...m, ids: fn(m.ids) } : m))
      );

    return {
      add: (module: DashboardModule) => change((ms) => [...ms, module]),

      remove: (key: string) => {
        const m = current.current.modules.find((x) => x.key === key);
        if (m)
          change((ms) => ms.filter((x) => x.key !== key), `„${moduleTitle(m)}” a fost eliminat`);
      },

      /** Puts another module in the place of `key`. */
      replace: (key: string, module: DashboardModule) =>
        change((ms) => ms.map((m) => (m.key === key ? module : m))),

      move: (key: string, by: -1 | 1) =>
        change((ms) => {
          const i = ms.findIndex((m) => m.key === key);
          const j = i + by;
          if (i < 0 || j < 0 || j >= ms.length) return ms;
          const next = [...ms];
          [next[i], next[j]] = [next[j], next[i]];
          return next;
        }),

      rename: (key: string, title: string) =>
        change((ms) => ms.map((m) => (m.key === key && m.type === 'stats' ? { ...m, title } : m))),

      addMeasurement: (key: string, id: MeasurementId) =>
        updateStats(key, (ids) => (ids.includes(id) ? ids : [...ids, id])),

      removeMeasurement: (key: string, id: MeasurementId) =>
        updateStats(key, (ids) => ids.filter((x) => x !== id)),

      replaceMeasurement: (key: string, from: MeasurementId, to: MeasurementId) =>
        updateStats(key, (ids) => (ids.includes(to) ? ids : ids.map((x) => (x === from ? to : x)))),

      applyPreset: (id: PresetId) => {
        const previous = current.current;
        if (previous.preset === id) return;
        const title = PRESETS.find((p) => p.id === id)!.title;
        setUndo({ id: Date.now(), message: `Configurația „${title}” a fost aplicată`, previous });
        setLayout(presetLayout(id));
      },

      undoLast: () => {
        const u = lastUndo.current;
        if (!u) return;
        setLayout(u.previous);
        setUndo(null);
      },

      dismissUndo: () => setUndo(null),
    };
  }, []);

  return { layout, loaded, undo, ...actions };
}
