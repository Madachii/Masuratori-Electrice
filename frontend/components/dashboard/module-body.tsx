import { EnergyCounter } from '@/components/meter/energy-counter';
import { MeasurementList } from '@/components/meter/measurement-list';
import { PhaseCard } from '@/components/meter/phase-card';
import { PowerCard } from '@/components/meter/power-card';
import { SectionHeading } from '@/components/meter/reading';
import { StatStrip } from '@/components/meter/stat-strip';
import { Text } from '@/components/ui/text';
import { type DashboardModule } from '@/lib/dashboard';
import { LABEL } from '@/lib/format';
import { hintFor } from '@/lib/hints';
import type { Snapshot } from '@/lib/measurements';
import type { Meter } from '@/lib/meters';
import { cn } from '@/lib/utils';
import { View } from 'react-native';

/** Everything a module may need to draw itself. */
export type ModuleContext = {
  snapshot: Snapshot;
  history: number[];
  intervalMs: number;
  meter: Meter;
  wide: boolean;
};

/** How much of a shared row a card module takes on wide screens. */
export const CARD_FLEX: Partial<Record<DashboardModule['type'], string>> = {
  energy: 'flex-[3]',
  power: 'flex-[2]',
};

/** Draws one module; the same for every module type, so the page only lists them. */
export function ModuleBody({
  module: m,
  ctx,
  className,
}: {
  module: DashboardModule;
  ctx: ModuleContext;
  className?: string;
}) {
  const { snapshot: s, wide } = ctx;

  switch (m.type) {
    case 'energy':
      return <EnergyCounter snapshot={s} large={wide} className={className} />;

    case 'power':
      return (
        <PowerCard
          snapshot={s}
          history={ctx.history}
          intervalMs={ctx.intervalMs}
          className={className}
        />
      );

    case 'phases': {
      const phases = [
        { phase: 1, voltage: s.U_L1N, current: s.I_L1, lineVoltage: s.U_L1L2 },
        { phase: 2, voltage: s.U_L2N, current: s.I_L2, lineVoltage: s.U_L2L3 },
        { phase: 3, voltage: s.U_L3N, current: s.I_L3, lineVoltage: s.U_L3L1 },
      ] as const;
      return (
        <View className={cn('gap-4', className)}>
          <SectionHeading
            title="Faze"
            note={`Nominal 230 V fază–neutru · ${ctx.meter.ratedCurrent} A`}
          />
          <View className={cn('gap-4', wide && 'flex-row')}>
            {phases.map((p) => (
              <PhaseCard
                key={p.phase}
                {...p}
                ratedCurrent={ctx.meter.ratedCurrent}
                className={wide ? 'flex-1' : undefined}
              />
            ))}
          </View>
        </View>
      );
    }

    case 'stats':
      return (
        <View className={cn('gap-4', className)}>
          <SectionHeading title={m.title || 'Fără titlu'} />
          {m.ids.length === 0 ? (
            <Text variant="muted">Nicio mărime în acest grup.</Text>
          ) : (
            <StatStrip
              wide={wide}
              stats={m.ids.map((id) => ({ label: LABEL[id], m: s[id], hint: hintFor(id, s[id]) }))}
            />
          )}
        </View>
      );

    case 'list':
      return (
        <View className={cn('gap-4', className)}>
          <SectionHeading title="Toate mărimile" />
          <MeasurementList snapshot={s} wide={wide} />
        </View>
      );
  }
}

/**
 * Splits the modules into rows: on wide screens neighbouring cards (energy, power) share a row,
 * everything else takes the full width.
 */
export function toRows(modules: DashboardModule[], wide: boolean): DashboardModule[][] {
  const rows: DashboardModule[][] = [];
  for (const m of modules) {
    const last = rows[rows.length - 1];
    if (wide && CARD_FLEX[m.type] && last && last.length < 2 && CARD_FLEX[last[0].type])
      last.push(m);
    else rows.push([m]);
  }
  return rows;
}
