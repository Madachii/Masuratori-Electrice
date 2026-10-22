import { ErrorTag, Reading } from '@/components/meter/reading';
import { Sparkline } from '@/components/meter/sparkline';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { Snapshot } from '@/lib/measurements';
import { cn } from '@/lib/utils';
import { View } from 'react-native';

export function PowerCard({
  snapshot,
  history,
  intervalMs,
  className,
}: {
  snapshot: Snapshot;
  history: number[];
  intervalMs: number;
  className?: string;
}) {
  const seconds = Math.round((history.length * intervalMs) / 1000);
  return (
    <Card className={cn('gap-4 p-5', className)}>
      <View className="flex-row items-start justify-between gap-3">
        <Text className="font-display text-lg">Putere activă</Text>
        <ErrorTag m={snapshot.P_ACTIVE} />
      </View>
      <Reading m={snapshot.P_ACTIVE} size="xl" />
      <View className="gap-1">
        <Sparkline data={history} />
        <Text className="text-xs text-muted-foreground">
          {history.length === 0
            ? 'fără date de putere'
            : `ultimele ${seconds < 60 ? `${seconds} s` : `${Math.round(seconds / 60)} min`}`}
        </Text>
      </View>
      <View className="flex-row gap-8 border-t border-border pt-4">
        <View className="gap-0.5">
          <Text className="text-xs text-muted-foreground">Cerere</Text>
          <Reading m={snapshot.DEMAND_ACTIVE} size="sm" />
        </View>
        <View className="gap-0.5">
          <Text className="text-xs text-muted-foreground">Vârf</Text>
          <Reading m={snapshot.PEAK_ACTIVE} size="sm" />
        </View>
      </View>
    </Card>
  );
}
