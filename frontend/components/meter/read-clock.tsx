import { Text } from '@/components/ui/text';
import { useNow } from '@/hooks/use-meter';
import { clock } from '@/lib/format';
import { STALE_AFTER_MS } from '@/lib/measurements';
import { View } from 'react-native';

/** Time of the last read and a countdown (text + thin bar) to the next one. */
export function ReadClock({
  updatedAt,
  intervalMs,
  error,
}: {
  updatedAt: number | null;
  intervalMs: number;
  error: string | null;
}) {
  const now = useNow(250);

  if (updatedAt === null) {
    return (
      <Text className="font-mono text-xs text-muted-foreground">
        {error ? 'Datele nu au putut fi citite' : 'Se citesc datele…'}
      </Text>
    );
  }

  const age = now - updatedAt;
  if (error || age > STALE_AFTER_MS) {
    return (
      <Text className="font-mono text-xs text-destructive">
        Ultima citire la {clock(updatedAt)} · nicio citire nouă de {Math.round(age / 1000)} s
      </Text>
    );
  }

  const progress = Math.min(1, age / intervalMs);
  const left = Math.max(0, Math.ceil((intervalMs - age) / 1000));
  return (
    <View className="gap-1.5">
      <Text className="font-mono text-xs text-muted-foreground">
        Citit la {clock(updatedAt)} · următoarea citire în {left} s
      </Text>
      <View className="h-0.5 overflow-hidden rounded-full bg-muted">
        <View className="h-0.5 bg-accent" style={{ width: `${progress * 100}%` }} />
      </View>
    </View>
  );
}
