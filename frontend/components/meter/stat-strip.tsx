import { ErrorTag, Reading } from '@/components/meter/reading';
import { Text } from '@/components/ui/text';
import type { Measurement } from '@/lib/measurements';
import { cn } from '@/lib/utils';
import { View } from 'react-native';

export type Hint = { text: string; tone: 'ok' | 'warn' | 'bad' };

export type Stat = { label: string; m?: Measurement; hint?: Hint };

const TONE: Record<Hint['tone'], string> = {
  ok: 'text-ok',
  warn: 'text-warn',
  bad: 'text-destructive',
};

/** A row of figures separated by hairlines; two columns on narrow screens. */
export function StatStrip({ stats, wide }: { stats: Stat[]; wide: boolean }) {
  return (
    <View className={cn('flex-row flex-wrap border-t border-border', wide && 'border-b')}>
      {stats.map(({ label, m, hint }, i) => (
        <View
          key={label}
          className={cn(
            'gap-1.5',
            wide
              ? cn('flex-1 px-5 py-5', i === 0 ? 'pl-0' : 'border-l border-border')
              : cn('w-1/2 border-b border-border py-4', i % 2 === 1 && 'border-l pl-4')
          )}>
          <Text className="text-sm text-muted-foreground">{label}</Text>
          <Reading m={m} size="md" />
          {m && !m.valid ? (
            <ErrorTag m={m} />
          ) : hint ? (
            <Text className={cn('text-xs font-medium', TONE[hint.tone])}>{hint.text}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}
