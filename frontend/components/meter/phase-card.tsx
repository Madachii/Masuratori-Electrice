import { ErrorTag, Reading } from '@/components/meter/reading';
import { BandScale, LoadBar, PHASE_BG } from '@/components/meter/scales';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { openMeasurement } from '@/lib/navigation';
import type { Measurement, Snapshot } from '@/lib/measurements';
import { bandFor } from '@/lib/ranges';
import { cn } from '@/lib/utils';
import { Pressable, View } from 'react-native';

type Phase = 1 | 2 | 3;

const PHASES = [
  { phase: 1, voltage: 'U_L1N', current: 'I_L1', line: 'U_L1L2' },
  { phase: 2, voltage: 'U_L2N', current: 'I_L2', line: 'U_L2L3' },
  { phase: 3, voltage: 'U_L3N', current: 'I_L3', line: 'U_L3L1' },
] as const;

const valueOf = (m?: Measurement) => (m?.valid && m.value !== null ? m.value : null);

/** Voltage and current of the three phases: stacked on phones, side by side on wide screens. */
export function PhasesCard({
  snapshot: s,
  ratedCurrent,
  wide,
  className,
}: {
  snapshot: Snapshot;
  ratedCurrent: number;
  wide: boolean;
  className?: string;
}) {
  return (
    <Card className={cn('gap-0 overflow-hidden p-0', wide && 'flex-row', className)}>
      {PHASES.map((p, i) => (
        <View
          key={p.phase}
          className={cn(
            'gap-4 p-5',
            wide ? 'flex-1' : '',
            i > 0 && (wide ? 'border-l border-border' : 'border-t border-border')
          )}>
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-row items-center gap-2">
              <View className={cn('size-3 rounded-[3px]', PHASE_BG[p.phase as Phase])} />
              <Text className="font-display-bold text-lg">L{p.phase}</Text>
            </View>
            <Pressable
              onPress={() => openMeasurement(p.line)}
              className="flex-row items-baseline gap-2">
              <Text className="text-sm text-muted-foreground">
                L{p.phase}–L{(p.phase % 3) + 1}
              </Text>
              <Reading m={s[p.line]} size="sm" />
            </Pressable>
          </View>

          <View className="flex-row gap-5">
            <Pressable onPress={() => openMeasurement(p.voltage)} className="flex-1 gap-1">
              <Text className="text-sm text-muted-foreground">Tensiune fază–neutru</Text>
              <Reading m={s[p.voltage]} size="lg" />
              <ErrorTag m={s[p.voltage]} />
              <BandScale
                band={bandFor(p.voltage)!}
                value={valueOf(s[p.voltage])}
                className="mt-1"
              />
            </Pressable>
            <Pressable onPress={() => openMeasurement(p.current)} className="flex-1 gap-1">
              <Text className="text-sm text-muted-foreground">Curent</Text>
              <Reading m={s[p.current]} size="lg" />
              <ErrorTag m={s[p.current]} />
              <LoadBar
                value={valueOf(s[p.current])}
                rated={ratedCurrent}
                phase={p.phase as Phase}
                className="mt-1"
              />
            </Pressable>
          </View>
        </View>
      ))}
    </Card>
  );
}
