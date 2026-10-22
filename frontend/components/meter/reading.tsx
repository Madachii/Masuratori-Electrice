import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { ERROR_LABEL, display } from '@/lib/format';
import type { Measurement } from '@/lib/measurements';
import { cn } from '@/lib/utils';
import { View, type TextStyle } from 'react-native';

/** Same-width digits so values don't jitter as they update. */
export const TABULAR: TextStyle = { fontVariant: ['tabular-nums'] };

type Size = 'sm' | 'md' | 'lg' | 'xl';

const VALUE_SIZE: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-2xl',
  lg: 'text-4xl',
  xl: 'text-5xl',
};
const UNIT_SIZE: Record<Size, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
};

/** A value with its unit; shows a dash when the measurement failed validation. */
export function Reading({ m, size = 'md', className }: { m?: Measurement; size?: Size; className?: string }) {
  const { value, unit } = display(m);
  const invalid = !m || !m.valid;
  return (
    <View className={cn('flex-row items-baseline gap-1.5', className)}>
      <Text
        className={cn('font-display-bold tracking-tight', VALUE_SIZE[size], invalid && 'text-muted-foreground')}
        style={TABULAR}>
        {value}
      </Text>
      {unit ? <Text className={cn('text-muted-foreground', UNIT_SIZE[size])}>{unit}</Text> : null}
    </View>
  );
}

export function ErrorTag({ m, className }: { m?: Measurement; className?: string }) {
  if (!m || m.valid || !m.error) return null;
  return (
    <Badge variant="destructive" className={cn('shrink-0 self-start', className)}>
      <Text>{ERROR_LABEL[m.error]}</Text>
    </Badge>
  );
}

export function SectionHeading({ title, note }: { title: string; note?: string }) {
  return (
    <View className="flex-row flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <Text className="font-display text-xl tracking-tight">{title}</Text>
      {note ? <Text className="text-sm text-muted-foreground">{note}</Text> : null}
    </View>
  );
}
