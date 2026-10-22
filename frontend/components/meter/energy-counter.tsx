import { ErrorTag, Reading } from '@/components/meter/reading';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { Snapshot } from '@/lib/measurements';
import { cn } from '@/lib/utils';
import { View } from 'react-native';

const INT_DIGITS = 7;

/** Combined active energy drawn like the drum register of an electricity meter. */
export function EnergyCounter({ snapshot, large, className }: { snapshot: Snapshot; large: boolean; className?: string }) {
  const m = snapshot.E_ACTIVE_COMB;
  const ok = m?.valid && m.value !== null;
  const wh = ok ? Math.floor(m.value!) : 0;
  const whole = ok ? String(Math.floor(wh / 1000)).padStart(INT_DIGITS, '0') : '–'.repeat(INT_DIGITS);
  const frac = ok ? String(wh % 1000).padStart(3, '0') : '–––';

  return (
    <Card className={cn('gap-5 p-5', className)}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="gap-1">
          <Text className="font-display text-lg">Energie activă combinată</Text>
          <Text variant="muted">Import + export, de la punerea în funcțiune</Text>
        </View>
        <ErrorTag m={m} />
      </View>

      <View className={cn('flex-row items-end', large ? 'gap-1' : 'gap-0.5')}>
        {whole.split('').map((d, i) => (
          <Digit key={i} d={d} large={large} />
        ))}
        <Text className={cn('font-mono-bold text-muted-foreground', large ? 'text-5xl' : 'text-2xl')}>,</Text>
        {frac.split('').map((d, i) => (
          <Digit key={i} d={d} large={large} fraction />
        ))}
        <Text className={cn('ml-2 font-mono text-muted-foreground', large ? 'text-xl' : 'text-sm')}>kWh</Text>
      </View>

      <View className="flex-row flex-wrap gap-x-8 gap-y-3 border-t border-border pt-4">
        <SubReading label="Import" m={snapshot.E_ACTIVE_FWD} />
        <SubReading label="Export" m={snapshot.E_ACTIVE_REV} />
        <SubReading label="Aparentă" m={snapshot.E_APPARENT} />
      </View>
    </Card>
  );
}

function Digit({ d, large, fraction }: { d: string; large: boolean; fraction?: boolean }) {
  return (
    <View
      className={cn(
        'items-center rounded-md',
        large ? 'w-11 py-2' : 'w-6 py-1',
        fraction ? 'bg-accent' : 'bg-primary'
      )}>
      <Text
        className={cn(
          'font-mono-bold',
          large ? 'text-4xl' : 'text-xl',
          fraction ? 'text-accent-foreground' : 'text-primary-foreground'
        )}>
        {d}
      </Text>
    </View>
  );
}

function SubReading({ label, m }: { label: string; m: Snapshot[keyof Snapshot] }) {
  return (
    <View className="gap-0.5">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <Reading m={m} size="sm" />
    </View>
  );
}
