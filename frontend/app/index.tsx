import { EnergyCounter } from '@/components/meter/energy-counter';
import { PhaseCard } from '@/components/meter/phase-card';
import { PowerCard } from '@/components/meter/power-card';
import { MeasurementList } from '@/components/meter/measurement-list';
import { MeterSelect } from '@/components/meter/meter-select';
import { ReadClock } from '@/components/meter/read-clock';
import { SectionHeading } from '@/components/meter/reading';
import { StatStrip, type Hint } from '@/components/meter/stat-strip';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { useMeter } from '@/hooks/use-meter';
import type { Measurement } from '@/lib/measurements';
import { API_URL, createApiSource } from '@/lib/api';
import { LIVE_METER, LOCATION, METERS, maxPowerW } from '@/lib/meters';
import { createMockSource } from '@/lib/mock-meter';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const POLL_MS = 5000;
// With a backend configured we show the one meter it serves; otherwise simulated meters.
const AVAILABLE = API_URL ? [LIVE_METER] : METERS;

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
  const [meter, setMeter] = React.useState(AVAILABLE[0]);
  const source = React.useMemo(() => (API_URL ? createApiSource() : createMockSource(meter)), [meter]);
  const readings = useMeter(source, POLL_MS, maxPowerW(meter));
  const s = readings.snapshot;
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="px-4 pb-16 pt-6 md:px-8">
        <View className="w-full max-w-[1200px] gap-8 self-center">
          <View className="gap-4">
            <View className={cn('gap-4', wide && 'flex-row items-end justify-between')}>
              <View className="gap-1">
                <Text className="text-sm text-muted-foreground">{LOCATION}</Text>
                <Text className="font-display-bold text-3xl tracking-tight md:text-4xl">{meter.name}</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className={wide ? 'w-[260px]' : 'flex-1'}>
                  <MeterSelect meters={AVAILABLE} value={meter} onChange={setMeter} className="w-full" />
                </View>
                <ThemeToggle />
              </View>
            </View>
            <View className={wide ? 'flex-row items-start gap-4' : 'gap-2'}>
              <View className={wide ? 'w-[380px]' : undefined}>
                <ReadClock
                  updatedAt={readings.updatedAt}
                  polledAt={readings.polledAt}
                  intervalMs={POLL_MS}
                  error={readings.error}
                />
              </View>
              {API_URL ? null : (
                <Badge variant="outline" className="self-start">
                  <Text>date simulate</Text>
                </Badge>
              )}
            </View>
          </View>

          <View className={cn('gap-4', wide && 'flex-row')}>
            <EnergyCounter snapshot={s} large={wide} className={wide ? 'flex-[3]' : undefined} />
            <PowerCard snapshot={s} history={readings.history} intervalMs={POLL_MS} className={wide ? 'flex-[2]' : undefined} />
          </View>

          <View className="gap-4">
            <SectionHeading title="Faze" note={`Nominal 230 V fază–neutru · ${meter.ratedCurrent} A`} />
            <View className={cn('gap-4', wide && 'flex-row')}>
              <PhaseCard phase={1} voltage={s.U_L1N} current={s.I_L1} lineVoltage={s.U_L1L2} ratedCurrent={meter.ratedCurrent} className={wide ? 'flex-1' : undefined} />
              <PhaseCard phase={2} voltage={s.U_L2N} current={s.I_L2} lineVoltage={s.U_L2L3} ratedCurrent={meter.ratedCurrent} className={wide ? 'flex-1' : undefined} />
              <PhaseCard phase={3} voltage={s.U_L3N} current={s.I_L3} lineVoltage={s.U_L3L1} ratedCurrent={meter.ratedCurrent} className={wide ? 'flex-1' : undefined} />
            </View>
          </View>

          <View className="gap-4">
            <SectionHeading title="Rețea" />
            <StatStrip
              wide={wide}
              stats={[
                { label: 'Factor de putere', m: s.PF, hint: pfHint(s.PF) },
                { label: 'Frecvență', m: s.FREQ, hint: freqHint(s.FREQ) },
                { label: 'Putere reactivă', m: s.P_REACTIVE },
                { label: 'Putere aparentă', m: s.P_APPARENT },
                { label: 'Curent neutru', m: s.I_N },
                { label: 'Curent la pământ', m: s.I_G },
              ]}
            />
          </View>

          <View className="gap-4">
            <SectionHeading title="Toate mărimile" />
            <MeasurementList snapshot={s} wide={wide} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
