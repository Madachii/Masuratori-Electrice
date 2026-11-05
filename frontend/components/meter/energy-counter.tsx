import { ErrorTag, Reading } from '@/components/meter/reading';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { Snapshot } from '@/lib/measurements';
import { openMeasurement } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { Pressable, View } from 'react-native';

/** Whole kWh shown with at least this many drums, like the register of an electricity meter. */
const MIN_DIGITS = 5;

/** Splits "26360" into ["26", "360"], so thousands sit a little apart. */
const thousands = (digits: string) => {
  const groups: string[] = [];
  for (let end = digits.length; end > 0; end -= 3)
    groups.unshift(digits.slice(Math.max(0, end - 3), end));
  return groups;
};

/** Combined active energy drawn like the drum register of an electricity meter. */
export function EnergyCounter({
  snapshot,
  large,
  className,
}: {
  snapshot: Snapshot;
  large: boolean;
  className?: string;
}) {
  const m = snapshot.E_ACTIVE_COMB;
  const ok = m?.valid && m.value !== null;
  const wh = ok ? Math.round(m.value! * 1000) : 0;
  const whole = ok
    ? String(Math.floor(wh / 1000)).padStart(MIN_DIGITS, '0')
    : '–'.repeat(MIN_DIGITS);
  const frac = ok ? String(wh % 1000).padStart(3, '0') : '–––';

  return (
    <Card className={cn('justify-between gap-5 p-6', className)}>
      <Pressable onPress={() => openMeasurement('E_ACTIVE_COMB')} className="gap-5">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="font-display text-xl">Energie activă combinată</Text>
            <Text className="text-sm text-muted-foreground">Import + export</Text>
          </View>
          <ErrorTag m={m} />
        </View>

        <View className="flex-row flex-wrap items-end gap-y-2">
          {thousands(whole).map((group, g) => (
            <View key={g} className={cn('flex-row', large ? 'mr-3 gap-1' : 'mr-1.5 gap-[3px]')}>
              {group.split('').map((d, i) => (
                <Digit key={i} d={d} large={large} />
              ))}
            </View>
          ))}
          <Text
            className={cn(
              'mr-1.5 font-display-bold text-muted-foreground',
              large ? 'text-4xl' : 'text-2xl'
            )}>
            ,
          </Text>
          <View className={cn('flex-row', large ? 'gap-1' : 'gap-[3px]')}>
            {frac.split('').map((d, i) => (
              <Digit key={i} d={d} large={large} fraction />
            ))}
          </View>
          <Text
            className={cn('mb-1 text-muted-foreground', large ? 'ml-3 text-lg' : 'ml-2 text-sm')}>
            kWh
          </Text>
        </View>
      </Pressable>

      <View className="flex-row gap-4 border-t border-border pt-4">
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
        large ? 'w-12 py-2' : 'w-[25px] py-1.5',
        fraction ? 'border border-border bg-muted' : 'bg-digit'
      )}>
      <Text
        className={cn(
          'font-display-bold',
          large ? 'text-4xl' : 'text-xl',
          fraction ? 'text-muted-foreground' : 'text-digit-foreground'
        )}>
        {d}
      </Text>
    </View>
  );
}

function SubReading({ label, m }: { label: string; m: Snapshot[keyof Snapshot] }) {
  return (
    <View className="flex-1 gap-0.5">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Reading m={m} size="sm" />
    </View>
  );
}
