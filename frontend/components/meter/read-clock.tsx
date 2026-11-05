import { TABULAR } from '@/components/meter/reading';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useNow } from '@/hooks/use-meter';
import { ago, clock, dateTime } from '@/lib/format';
import { LIVE_WITHIN_MS, STALE_AFTER_MS } from '@/lib/measurements';
import { cn } from '@/lib/utils';
import { ClockIcon, WifiOffIcon } from 'lucide-react-native';
import { View } from 'react-native';

/**
 * When the meter was last read. While readings arrive every few seconds it counts down to the
 * next poll; an old reading or a failed poll becomes a warning instead.
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
    return error ? (
      <Warning icon={WifiOffIcon} title="Datele nu au putut fi citite" body={error} />
    ) : (
      <StatusPill dot="bg-muted-foreground">Se citesc datele…</StatusPill>
    );
  }

  // Clamped: the reader's clock can be slightly ahead of this device's.
  const age = Math.max(0, now - updatedAt);
  const last = `Ultima citire: ${dateTime(updatedAt, now)}`;

  if (error)
    return <Warning icon={WifiOffIcon} title="Citirea a eșuat" body={`${error} · ${last}`} />;
  if (age > STALE_AFTER_MS)
    return <Warning icon={ClockIcon} title={`Citire veche · ${ago(updatedAt, now)}`} body={last} />;

  if (age < LIVE_WITHIN_MS) {
    const sincePoll = Math.max(0, now - (polledAt ?? updatedAt));
    const left = Math.max(0, Math.ceil((intervalMs - sincePoll) / 1000));
    return (
      <StatusPill dot="bg-ok">
        Citit la {clock(updatedAt)} · următoarea în {left} s
      </StatusPill>
    );
  }

  return (
    <StatusPill dot="bg-muted-foreground">
      {dateTime(updatedAt, now)} · {ago(updatedAt, now)}
    </StatusPill>
  );
}

function StatusPill({ dot, children }: { dot: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-2 self-start rounded-full border border-border bg-card px-3.5 py-1.5">
      <View className={cn('size-2 rounded-full', dot)} />
      <Text className="text-sm text-muted-foreground" style={TABULAR}>
        {children}
      </Text>
    </View>
  );
}

function Warning({ icon, title, body }: { icon: typeof ClockIcon; title: string; body: string }) {
  return (
    <View className="flex-row gap-3 rounded-2xl bg-warn-soft p-4">
      <Icon as={icon} className="mt-0.5 size-5 text-warn" />
      <View className="flex-1 gap-0.5">
        <Text className="font-semibold text-warn">{title}</Text>
        <Text className="text-sm text-foreground" style={TABULAR}>
          {body}
        </Text>
      </View>
    </View>
  );
}
