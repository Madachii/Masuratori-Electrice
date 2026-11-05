import { Text } from '@/components/ui/text';
import { num } from '@/lib/format';
import { inBand, type Band } from '@/lib/ranges';
import { cn } from '@/lib/utils';
import { View } from 'react-native';

type Phase = 1 | 2 | 3;

// Static class names so Tailwind picks them up.
export const PHASE_BG: Record<Phase, string> = {
  1: 'bg-phase-1',
  2: 'bg-phase-2',
  3: 'bg-phase-3',
};

const pct = (v: number, min: number, max: number) =>
  Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));

/**
 * A scale with the acceptable band in green and a needle at the reading.
 * `full` also labels the ends of the scale, not only the band and the nominal value.
 */
export function BandScale({
  band,
  value,
  full,
  className,
}: {
  band: Band;
  value: number | null;
  full?: boolean;
  className?: string;
}) {
  const { min, max, lo, hi, nominal } = band;
  const ok = value !== null && inBand(band, value);
  const ticks = [
    ...(full ? [min] : []),
    lo,
    ...(nominal !== undefined ? [nominal] : []),
    hi,
    ...(full ? [max] : []),
  ];
  // Labels too close to each other would overlap; keep the first of each pair.
  const shown = ticks.filter(
    (t, i) => i === 0 || pct(t, min, max) - pct(ticks[i - 1], min, max) > 6
  );

  return (
    <View className={cn('gap-1.5', className)}>
      <View className="h-5 justify-center">
        <View className="h-2 rounded-full bg-muted" />
        <View
          className="absolute h-2 rounded-full bg-band"
          style={{
            left: `${pct(lo, min, max)}%`,
            width: `${pct(hi, min, max) - pct(lo, min, max)}%`,
          }}
        />
        {value !== null ? (
          <View
            className={cn(
              'absolute -ml-[2px] h-5 w-1 rounded-full',
              ok ? 'bg-foreground' : 'bg-destructive'
            )}
            style={{ left: `${pct(value, min, max)}%` }}
          />
        ) : null}
      </View>
      <View className="h-4">
        {shown.map((t) => {
          const p = pct(t, min, max);
          const edge =
            p < 4
              ? { left: 0 }
              : p > 96
                ? { right: 0 }
                : { left: `${p}%` as const, marginLeft: -20, width: 40 };
          return (
            <Text
              key={t}
              className={cn(
                'absolute text-xs text-muted-foreground',
                p >= 4 && p <= 96 && 'text-center'
              )}
              style={edge}>
              {num(t, band.decimals)}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

/** How much of the rated current a phase carries. */
export function LoadBar({
  value,
  rated,
  phase,
  className,
}: {
  value: number | null;
  rated: number;
  phase?: Phase;
  className?: string;
}) {
  return (
    <View className={cn('gap-1.5', className)}>
      <View className="h-5 justify-center">
        <View className="h-2 overflow-hidden rounded-full bg-muted">
          {value !== null ? (
            <View
              className={cn('h-2 rounded-full', phase ? PHASE_BG[phase] : 'bg-primary')}
              style={{ width: `${pct(value, 0, rated)}%` }}
            />
          ) : null}
        </View>
      </View>
      <Text className="h-4 text-xs text-muted-foreground">
        {value !== null
          ? `${Math.round((value / rated) * 100)}% din ${rated} A`
          : `nominal ${rated} A`}
      </Text>
    </View>
  );
}
