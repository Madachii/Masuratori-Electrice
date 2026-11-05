import { Carousel, chunk } from '@/components/dashboard/carousel';
import { EnergyCounter } from '@/components/meter/energy-counter';
import { PhasesCard } from '@/components/meter/phase-card';
import { PowerCard } from '@/components/meter/power-card';
import { SectionHeading } from '@/components/meter/reading';
import { StatGrid } from '@/components/meter/stat-grid';
import { Text } from '@/components/ui/text';
import type { History } from '@/hooks/use-meter';
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
  history: History;
  intervalMs: number;
  live: boolean;
  meter: Meter;
  wide: boolean;
};

/** On narrow screens a long group shows three rows of two, the rest on further carousel pages. */
const STATS_PER_PAGE = 6;

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
          live={ctx.live}
          className={className}
        />
      );

    case 'phases':
      return (
        <View className={cn('gap-3', className)}>
          <SectionHeading title="Faze" note={`Nominal 230 V · ${ctx.meter.ratedCurrent} A`} />
          <PhasesCard snapshot={s} ratedCurrent={ctx.meter.ratedCurrent} wide={wide} />
        </View>
      );

    case 'stats': {
      const stats = m.ids.map((id) => ({
        id,
        label: LABEL[id],
        m: s[id],
        hint: hintFor(id, s[id]),
      }));
      return (
        <View className={cn('gap-3', className)}>
          <SectionHeading title={m.title || 'Fără titlu'} />
          {m.ids.length === 0 ? (
            <Text variant="muted">Nicio mărime în acest grup.</Text>
          ) : wide || stats.length <= STATS_PER_PAGE ? (
            <StatGrid wide={wide} stats={stats} />
          ) : (
            <Carousel
              label={m.title || 'Fără titlu'}
              pages={chunk(stats, STATS_PER_PAGE).map((page, i) => (
                <StatGrid key={i} wide={false} stats={page} />
              ))}
            />
          )}
        </View>
      );
    }
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
