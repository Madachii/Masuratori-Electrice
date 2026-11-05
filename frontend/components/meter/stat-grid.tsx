import { ErrorTag, Reading } from '@/components/meter/reading';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { Hint } from '@/lib/hints';
import type { Measurement, MeasurementId } from '@/lib/measurements';
import { openMeasurement } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { Pressable, View } from 'react-native';

export type Stat = { id: MeasurementId; label: string; m?: Measurement; hint?: Hint };

const TONE: Record<Hint['tone'], string> = {
  ok: 'text-ok',
  warn: 'text-warn',
  bad: 'text-destructive',
};

/** Figures in a card, split by hairlines: two columns on phones, up to four on wide screens. */
export function StatGrid({ stats, wide }: { stats: Stat[]; wide: boolean }) {
  const columns = wide ? Math.min(4, stats.length) : 2;
  const rows = Math.ceil(stats.length / columns);
  return (
    <Card className="flex-row flex-wrap gap-0 overflow-hidden p-0">
      {stats.map(({ id, label, m, hint }, i) => (
        <Pressable
          key={id}
          onPress={() => openMeasurement(id)}
          style={{ width: `${100 / columns}%` }}
          className={cn(
            'min-h-[104px] gap-1 p-5 active:bg-muted web:hover:bg-muted/50',
            i % columns > 0 && 'border-l border-border',
            Math.floor(i / columns) < rows - 1 && 'border-b border-border'
          )}>
          <Text className="text-sm text-muted-foreground">{label}</Text>
          <Reading m={m} size="md" />
          {m && !m.valid ? (
            <ErrorTag m={m} />
          ) : hint ? (
            <Text className={cn('text-sm font-semibold', TONE[hint.tone])}>{hint.text}</Text>
          ) : null}
        </Pressable>
      ))}
    </Card>
  );
}
