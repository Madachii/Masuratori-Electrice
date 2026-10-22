import { EnergyCounter } from '@/components/meter/energy-counter';
import { PhaseCard } from '@/components/meter/phase-card';
import { PowerCard } from '@/components/meter/power-card';
import { SectionLabel } from '@/components/meter/reading';
import { RegisterTable } from '@/components/meter/register-table';
import { StatTile, type Hint } from '@/components/meter/stat-tile';
import { StatusPill } from '@/components/meter/status-pill';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { useMeter } from '@/hooks/use-meter';
import type { Measurement } from '@/lib/measurements';
import { createMockSource } from '@/lib/mock-meter';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// TODO: replace with the meter selected by the user / returned by the backend.
const METER = {
  name: 'Tablou general TG1',
  model: 'Eaton PXR10',
  ratedCurrent: 100,
};
const POLL_MS = 2000;

const pfHint = (m?: Measurement): Hint | undefined => {
  if (!m?.valid || m.value === null) return undefined;
  const pf = Math.abs(m.value);
  return pf >= 0.95 ? { text: 'Foarte bun', tone: 'ok' } : pf >= 0.9 ? { text: 'Acceptabil', tone: 'warn' } : { text: 'Scăzut, consum reactiv mare', tone: 'bad' };
};

const freqHint = (m?: Measurement): Hint | undefined => {
  if (!m?.valid || m.value === null) return undefined;
  return Math.abs(m.value - 50) <= 0.1 ? { text: 'În bandă ±0,1 Hz', tone: 'ok' } : { text: 'Abatere de la 50 Hz', tone: 'warn' };
};

export default function Dashboard() {
  // Swap for a FastAPI-backed source when the backend is ready; it only has to return raw words per register.
  const source = React.useMemo(createMockSource, []);
  const meter = useMeter(source, POLL_MS);
  const s = meter.snapshot;
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const tile = wide ? 'flex-1' : 'basis-[47%] grow';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="px-4 pb-16 pt-6 md:px-8">
        <View className="w-full max-w-[1200px] gap-8 self-center">
          <View className={cn('gap-4', wide && 'flex-row items-end justify-between')}>
            <View className="gap-1">
              <Text className="font-mono text-xs uppercase tracking-[2px] text-muted-foreground">
                {METER.model} · Modbus
              </Text>
              <Text className="font-display-bold text-3xl tracking-tight md:text-4xl">{METER.name}</Text>
            </View>
            <View className="flex-row flex-wrap items-center gap-2">
              <StatusPill updatedAt={meter.updatedAt} error={meter.error} />
              <Badge variant="outline">
                <Text>date simulate</Text>
              </Badge>
              <ThemeToggle />
            </View>
          </View>

          <View className="gap-4">
            <SectionLabel index="01" title="Energie și putere" />
            <View className={cn('gap-4', wide && 'flex-row')}>
              <EnergyCounter snapshot={s} large={wide} className={wide ? 'flex-[3]' : undefined} />
              <PowerCard snapshot={s} history={meter.history} intervalMs={POLL_MS} className={wide ? 'flex-[2]' : undefined} />
            </View>
          </View>

          <View className="gap-4">
            <SectionLabel index="02" title="Faze" />
            <View className={cn('gap-4', wide && 'flex-row')}>
              <PhaseCard phase={1} voltage={s.U_L1N} current={s.I_L1} lineVoltage={s.U_L1L2} ratedCurrent={METER.ratedCurrent} className={wide ? 'flex-1' : undefined} />
              <PhaseCard phase={2} voltage={s.U_L2N} current={s.I_L2} lineVoltage={s.U_L2L3} ratedCurrent={METER.ratedCurrent} className={wide ? 'flex-1' : undefined} />
              <PhaseCard phase={3} voltage={s.U_L3N} current={s.I_L3} lineVoltage={s.U_L3L1} ratedCurrent={METER.ratedCurrent} className={wide ? 'flex-1' : undefined} />
            </View>
          </View>

          <View className="gap-4">
            <SectionLabel index="03" title="Rețea" />
            <View className="flex-row flex-wrap gap-4">
              <StatTile className={tile} label="Factor de putere" m={s.PF} hint={pfHint(s.PF)} />
              <StatTile className={tile} label="Frecvență" m={s.FREQ} hint={freqHint(s.FREQ)} />
              <StatTile className={tile} label="Putere reactivă" m={s.P_REACTIVE} />
              <StatTile className={tile} label="Putere aparentă" m={s.P_APPARENT} />
              <StatTile className={tile} label="Curent neutru" m={s.I_N} />
              <StatTile className={tile} label="Curent la pământ" m={s.I_G} />
            </View>
          </View>

          <View className="gap-4">
            <SectionLabel index="04" title="Registre Modbus" />
            <RegisterTable snapshot={s} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
