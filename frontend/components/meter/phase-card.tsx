import { ErrorTag, Reading } from '@/components/meter/reading';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { Measurement } from '@/lib/measurements';
import { cn } from '@/lib/utils';
import { View } from 'react-native';

type Phase = 1 | 2 | 3;

// Static class names so Tailwind picks them up.
const PHASE_BG: Record<Phase, string> = { 1: 'bg-phase-1', 2: 'bg-phase-2', 3: 'bg-phase-3' };

const NOMINAL_V = 230;
const TOLERANCE = 0.1; // ±10 %, EN 50160
const SCALE_MIN = 200;
const SCALE_MAX = 260;

const pct = (v: number, min: number, max: number) => Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));

export function PhaseCard({
  phase,
  voltage,
  current,
  lineVoltage,
  ratedCurrent,
  className,
}: {
  phase: Phase;
  voltage?: Measurement;
  current?: Measurement;
  lineVoltage?: Measurement;
  ratedCurrent: number;
  className?: string;
}) {
  return (
    <Card className={cn('gap-5 p-5', className)}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className={cn('size-3 rounded-sm', PHASE_BG[phase])} />
          <Text className="font-display-bold text-lg">L{phase}</Text>
        </View>
        <View className="flex-row items-baseline gap-2">
          <Text className="text-xs text-muted-foreground">
            L{phase}–L{(phase % 3) + 1}
          </Text>
          <Reading m={lineVoltage} size="sm" />
        </View>
      </View>

      <View className="gap-3">
        <View className="flex-row items-end justify-between gap-2">
          <View className="gap-0.5">
            <Text className="text-xs text-muted-foreground">Tensiune fază–neutru</Text>
            <Reading m={voltage} size="lg" />
          </View>
          <ErrorTag m={voltage} />
        </View>
        <VoltageScale value={voltage?.valid ? voltage.value : null} />
      </View>

      <View className="gap-3">
        <View className="flex-row items-end justify-between gap-2">
          <View className="gap-0.5">
            <Text className="text-xs text-muted-foreground">Curent</Text>
            <Reading m={current} size="md" />
          </View>
          <ErrorTag m={current} />
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-muted">
          {current?.valid && current.value !== null ? (
            <View
              className={cn('h-2 rounded-full', PHASE_BG[phase])}
              style={{ width: `${pct(current.value, 0, ratedCurrent)}%` }}
            />
          ) : null}
        </View>
        <Text className="text-xs text-muted-foreground">
          {current?.valid && current.value !== null
            ? `${Math.round((current.value / ratedCurrent) * 100)}% din ${ratedCurrent} A nominal`
            : `nominal ${ratedCurrent} A`}
        </Text>
      </View>
    </Card>
  );
}

/** Horizontal scale 200–260 V with the ±10 % band around 230 V and a needle at the reading. */
function VoltageScale({ value }: { value: number | null }) {
  const lo = NOMINAL_V * (1 - TOLERANCE);
  const hi = NOMINAL_V * (1 + TOLERANCE);
  const inBand = value !== null && value >= lo && value <= hi;
  const ticks = [lo, NOMINAL_V, hi];

  return (
    <View className="gap-1">
      <View className="h-4 justify-center">
        <View className="h-1.5 rounded-full bg-muted" />
        <View
          className="absolute h-1.5 rounded-full bg-ok"
          style={{ left: `${pct(lo, SCALE_MIN, SCALE_MAX)}%`, width: `${pct(hi, SCALE_MIN, SCALE_MAX) - pct(lo, SCALE_MIN, SCALE_MAX)}%`, opacity: 0.35 }}
        />
        {value !== null ? (
          <View
            className={cn('absolute h-4 w-1 -ml-0.5 rounded-full', inBand ? 'bg-foreground' : 'bg-destructive')}
            style={{ left: `${pct(value, SCALE_MIN, SCALE_MAX)}%` }}
          />
        ) : null}
      </View>
      <View className="h-3">
        {ticks.map((t) => (
          <Text
            key={t}
            className="absolute -ml-4 w-8 text-center text-[10px] text-muted-foreground"
            style={{ left: `${pct(t, SCALE_MIN, SCALE_MAX)}%` }}>
            {Math.round(t)}
          </Text>
        ))}
      </View>
    </View>
  );
}
