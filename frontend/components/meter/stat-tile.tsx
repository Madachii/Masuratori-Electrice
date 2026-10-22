import { ErrorTag, Reading } from '@/components/meter/reading';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { Measurement } from '@/lib/measurements';
import { cn } from '@/lib/utils';

export type Hint = { text: string; tone: 'ok' | 'warn' | 'bad' };

const TONE: Record<Hint['tone'], string> = {
  ok: 'text-ok',
  warn: 'text-warn',
  bad: 'text-destructive',
};

export function StatTile({ label, m, hint, className }: { label: string; m?: Measurement; hint?: Hint; className?: string }) {
  return (
    <Card className={cn('gap-2 p-4', className)}>
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <Reading m={m} size="md" />
      {m && !m.valid ? (
        <ErrorTag m={m} />
      ) : hint ? (
        <Text className={cn('text-xs font-medium', TONE[hint.tone])}>{hint.text}</Text>
      ) : null}
    </Card>
  );
}
