import { Text } from '@/components/ui/text';
import { ERROR_LABEL, display } from '@/lib/format';
import type { Measurement } from '@/lib/measurements';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Animated, Platform, View, type TextStyle } from 'react-native';

/** Same-width digits so values don't jitter as they update. */
export const TABULAR: TextStyle = { fontVariant: ['tabular-nums'] };

type Size = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const VALUE_SIZE: Record<Size, string> = {
  sm: 'text-base',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-6xl leading-[64px]',
  '2xl': 'text-7xl leading-[76px]',
};
const UNIT_SIZE: Record<Size, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-xl',
  '2xl': 'text-2xl',
};

/** Placeholder sizes close to the real value's, so nothing jumps when the first reading arrives. */
const SKELETON_SIZE: Record<Size, string> = {
  sm: 'h-5 w-16',
  md: 'h-7 w-20 my-0.5',
  lg: 'h-8 w-24 my-0.5',
  xl: 'h-14 w-44 my-1',
  '2xl': 'h-16 w-48 my-1.5',
};

/** True until the first reading arrives; values then show a pulsing placeholder instead of a dash. */
export const LoadingContext = React.createContext(false);

/** A value with its unit; shows a dash when the measurement failed validation. */
export function Reading({
  m,
  size = 'md',
  className,
}: {
  m?: Measurement;
  size?: Size;
  className?: string;
}) {
  const loading = React.useContext(LoadingContext);
  if (loading && !m) return <Skeleton className={cn(SKELETON_SIZE[size], className)} />;
  const { value, unit } = display(m);
  const invalid = !m || !m.valid;
  return (
    <View className={cn('flex-row items-baseline gap-1', className)}>
      <Text
        className={cn(
          'font-display-bold tracking-tight',
          VALUE_SIZE[size],
          invalid && 'text-muted-foreground'
        )}
        style={TABULAR}>
        {value}
      </Text>
      {unit ? <Text className={cn('text-muted-foreground', UNIT_SIZE[size])}>{unit}</Text> : null}
    </View>
  );
}

export function Skeleton({ className }: { className?: string }) {
  const [opacity] = React.useState(() => new Animated.Value(0.5));
  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 700,
          useNativeDriver: Platform.OS !== 'web',
        }),
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

const PILL_TONE = {
  neutral: 'bg-muted',
  primary: 'bg-primary-soft',
  ok: 'bg-ok-soft',
  bad: 'bg-destructive-soft',
} as const;
const PILL_TEXT = {
  neutral: 'text-muted-foreground',
  primary: 'text-primary',
  ok: 'text-ok',
  bad: 'text-destructive',
} as const;

/** Small rounded label, e.g. "Live" or an error. */
export function Pill({
  tone = 'neutral',
  children,
  icon,
  className,
}: {
  tone?: keyof typeof PILL_TONE;
  children: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <View
      className={cn(
        'shrink-0 flex-row items-center gap-1.5 self-start rounded-full px-3 py-1',
        PILL_TONE[tone],
        className
      )}>
      {icon}
      <Text className={cn('text-sm font-semibold', PILL_TEXT[tone])}>{children}</Text>
    </View>
  );
}

export function ErrorTag({ m, className }: { m?: Measurement; className?: string }) {
  if (!m || m.valid || !m.error) return null;
  return (
    <Pill tone="bad" className={className}>
      {ERROR_LABEL[m.error]}
    </Pill>
  );
}

export function SectionHeading({ title, note }: { title: string; note?: string }) {
  return (
    <View className="flex-row flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <Text className="font-display-bold text-xl tracking-tight">{title}</Text>
      {note ? <Text className="text-sm text-muted-foreground">{note}</Text> : null}
    </View>
  );
}
