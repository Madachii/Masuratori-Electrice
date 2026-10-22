import { TABULAR } from '@/components/meter/reading';
import { Text } from '@/components/ui/text';
import { useNow } from '@/hooks/use-meter';
import { clock } from '@/lib/format';
import { STALE_AFTER_MS } from '@/lib/measurements';
import { View } from 'react-native';

/** Time the meter was last read and a countdown (text + thin bar) to the next poll. */
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
  if (error || age > STALE_AFTER_MS) {
    return (
      <Text className="text-sm text-destructive" style={TABULAR}>
        Ultima citire la {clock(updatedAt)} · nicio citire nouă de {Math.round(age / 1000)} s
        {error ? ` · ${error}` : ''}
      </Text>
    );
  }

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
