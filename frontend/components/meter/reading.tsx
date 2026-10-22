import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { ERROR_LABEL, display } from '@/lib/format';
import type { Measurement } from '@/lib/measurements';
import { cn } from '@/lib/utils';
import { View } from 'react-native';

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
      <Text className={cn('font-mono-bold tracking-tight', VALUE_SIZE[size], invalid && 'text-muted-foreground')}>
        {value}
      </Text>
      {unit ? <Text className={cn('font-mono text-muted-foreground', UNIT_SIZE[size])}>{unit}</Text> : null}
    </View>
  );
}

export function ErrorTag({ m, className }: { m?: Measurement; className?: string }) {
  if (!m || m.valid || !m.error) return null;
  return (
    <Badge variant="destructive" className={cn('self-start', className)}>
      <Text>{ERROR_LABEL[m.error]}</Text>
    </Badge>
  );
}

export function SectionLabel({ index, title, right }: { index: string; title: string; right?: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-3">
      <Text className="font-mono text-xs text-accent">{index}</Text>
      <Text className="font-display text-xs uppercase tracking-[2px] text-muted-foreground">{title}</Text>
      <View className="h-px flex-1 bg-border" />
      {right}
    </View>
  );
}
