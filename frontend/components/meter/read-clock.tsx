import { TABULAR } from '@/components/meter/reading';
import { Text } from '@/components/ui/text';
import { useNow } from '@/hooks/use-meter';
import { ago, clock, dateTime } from '@/lib/format';
import { LIVE_WITHIN_MS, STALE_AFTER_MS } from '@/lib/measurements';
import { cn } from '@/lib/utils';
import { View } from 'react-native';

/**
 * When the meter was last read. While readings arrive every few seconds it also counts down
 * to the next poll; otherwise it shows how long ago the last reading was.
 */
export function ReadClock({
  updatedAt,
  polledAt,
  intervalMs,
  error,
}: {
  updatedAt: number | null;
  polledAt: number | null;
  intervalMs: number;
  error: string | null;
}) {
  const now = useNow(250);

  if (updatedAt === null) {
    return (
      <Text className="text-sm text-muted-foreground">
        {error ? `Datele nu au putut fi citite: ${error}` : 'Se citesc datele…'}
      </Text>
    );
  }

  // Clamped: the reader's clock can be slightly ahead of this device's.
  const age = Math.max(0, now - updatedAt);

  if (age < LIVE_WITHIN_MS && !error) {
    const sincePoll = Math.max(0, now - (polledAt ?? updatedAt));
    const progress = Math.min(1, sincePoll / intervalMs);
    const left = Math.max(0, Math.ceil((intervalMs - sincePoll) / 1000));
    return (
      <View className="gap-1.5">
        <Text className="text-sm text-muted-foreground" style={TABULAR}>
          Citit la {clock(updatedAt)} · următoarea verificare în {left} s
        </Text>
        <View className="h-0.5 overflow-hidden rounded-full bg-muted">
          <View className="h-0.5 bg-accent" style={{ width: `${progress * 100}%` }} />
        </View>
      </View>
    );
  }

  const flagged = !!error || age > STALE_AFTER_MS;
  return (
    <Text className={cn('text-sm', flagged ? 'text-destructive' : 'text-muted-foreground')} style={TABULAR}>
      Ultima citire: {dateTime(updatedAt, now)} · {ago(updatedAt, now)}
      {error ? ` · ${error}` : ''}
    </Text>
  );
}
