import { ErrorTag, Pill, Reading } from '@/components/meter/reading';
import { NoTrend, TrendChart } from '@/components/meter/trend-chart';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { History } from '@/hooks/use-meter';
import type { Snapshot } from '@/lib/measurements';
import { openMeasurement } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { Pressable, View } from 'react-native';

/** "5 min" or "40 s": how far back a trend of `points` readings goes. */
export function span(points: number, intervalMs: number) {
  const seconds = Math.round((points * intervalMs) / 1000);
  return seconds < 60 ? `${seconds} s` : `${Math.round(seconds / 60)} min`;
}

export function PowerCard({
  snapshot,
  history,
  intervalMs,
  live,
  className,
}: {
  snapshot: Snapshot;
  history: History;
  intervalMs: number;
  live: boolean;
  className?: string;
}) {
  const p = snapshot.P_ACTIVE;
  const kw = (history.P_ACTIVE ?? []).map((w) => w / 1000);
  return (
    <Card className={cn('gap-4 p-6', className)}>
      <Pressable onPress={() => openMeasurement('P_ACTIVE')} className="gap-3">
        <View className="flex-row items-start justify-between gap-3">
          <Text className="flex-1 font-display text-xl">Putere activă</Text>
          {p && !p.valid ? (
            <ErrorTag m={p} />
          ) : live ? (
            <Pill tone="primary" icon={<View className="size-1.5 rounded-full bg-primary" />}>
              Live
            </Pill>
          ) : p ? (
            <Pill>la ultima citire</Pill>
          ) : null}
        </View>
        <Reading m={p} size="xl" />
      </Pressable>

      {live && kw.length > 1 ? (
        <View className="gap-2">
          <TrendChart data={kw} />
          <View className="flex-row justify-between">
            <Text className="text-xs text-muted-foreground">−{span(kw.length, intervalMs)}</Text>
            <Text className="text-xs text-muted-foreground">acum</Text>
          </View>
        </View>
      ) : (
        <NoTrend text={live ? 'Se adună datele pentru grafic…' : 'Fără citiri recente'} />
      )}

      <View className="flex-row gap-8 border-t border-border pt-4">
        <View className="flex-1 gap-0.5">
          <Text className="text-sm text-muted-foreground">Cerere</Text>
          <Reading m={snapshot.DEMAND_ACTIVE} size="sm" />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="text-sm text-muted-foreground">Vârf</Text>
          <Reading m={snapshot.PEAK_ACTIVE} size="sm" />
        </View>
      </View>
    </Card>
  );
}
