import { Text } from '@/components/ui/text';
import { useNow } from '@/hooks/use-meter';
import { STALE_AFTER_MS } from '@/lib/measurements';
import { cn } from '@/lib/utils';
import { View } from 'react-native';

/** Connection state derived from the age of the last successful read. */
export function StatusPill({ updatedAt, error }: { updatedAt: number | null; error: string | null }) {
  const now = useNow();
  const age = updatedAt === null ? null : Math.max(0, Math.round((now - updatedAt) / 1000));
  const stale = updatedAt !== null && now - updatedAt > STALE_AFTER_MS;

  const [dot, text] =
    updatedAt === null
      ? ['bg-warn', error ? 'Fără conexiune' : 'Se conectează…']
      : stale || error
        ? ['bg-destructive', `Fără date noi · acum ${age} s`]
        : ['bg-ok', `Live · acum ${age} s`];

  return (
    <View className="flex-row items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
      <View className={cn('size-2 rounded-full', dot)} />
      <Text className="font-mono text-xs">{text}</Text>
    </View>
  );
}
