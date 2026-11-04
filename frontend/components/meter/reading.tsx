import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { ERROR_LABEL, display } from '@/lib/format';
import type { Measurement } from '@/lib/measurements';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Animated, Platform, View, type TextStyle } from 'react-native';

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

/** Placeholder sizes close to the real value's, so nothing jumps when the first reading arrives. */
const SKELETON_SIZE: Record<Size, string> = {
  sm: 'h-4 w-14 my-0.5',
  md: 'h-6 w-20 my-1',
  lg: 'h-9 w-28 my-0.5',
  xl: 'h-11 w-36 my-0.5',
};

/** True until the first reading arrives; values then show a pulsing placeholder instead of a dash. */
export const LoadingContext = React.createContext(false);

/** A value with its unit; shows a dash when the measurement failed validation. */
export function Reading({ m, size = 'md', className }: { m?: Measurement; size?: Size; className?: string }) {
  const loading = React.useContext(LoadingContext);
  if (loading && !m) return <Skeleton className={cn(SKELETON_SIZE[size], className)} />;
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

function Skeleton({ className }: { className?: string }) {
  const opacity = React.useRef(new Animated.Value(0.5)).current;
  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);
  return (
    <Animated.View style={{ opacity }} accessibilityLabel="Se încarcă">
      <View className={cn('rounded-md bg-muted', className)} />
    </Animated.View>
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
