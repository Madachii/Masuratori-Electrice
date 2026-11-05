import { Screen, ScreenTitle } from '@/components/screen';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { AVAILABLE_METERS, useMeterContext } from '@/hooks/meter-context';
import { useNow } from '@/hooks/use-meter';
import { ago } from '@/lib/format';
import { LOCATION, type Meter } from '@/lib/meters';
import { THEME } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { router } from 'expo-router';
import { CheckIcon, GaugeIcon, SearchIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Pressable, TextInput, View } from 'react-native';

/** Below this many meters a search box is more clutter than help. */
const SEARCH_FROM = 6;

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Meters() {
  const { meter: selected, setMeter } = useMeterContext();
  const [query, setQuery] = React.useState('');
  const { colorScheme } = useColorScheme();
  const shown = AVAILABLE_METERS.filter((m) => normalize(m.name).includes(normalize(query.trim())));

  const choose = (m: Meter) => {
    setMeter(m);
    router.navigate('/');
  };

  return (
    <Screen>
      <ScreenTitle title="Contoare" subtitle={LOCATION} />

      {AVAILABLE_METERS.length >= SEARCH_FROM ? (
        <View className="h-14 flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4">
          <Icon as={SearchIcon} className="size-5 text-muted-foreground" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Caută după clădire"
            placeholderTextColor={THEME[colorScheme ?? 'light'].mutedForeground}
            className="flex-1 text-base text-foreground web:outline-none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
      ) : null}

      {shown.length === 0 ? (
        <Card className="items-center p-8">
          <Text className="text-muted-foreground">Niciun contor găsit</Text>
        </Card>
      ) : (
        <Card className="gap-0 overflow-hidden p-0">
          {shown.map((m, i) => (
            <MeterRow
              key={m.id}
              meter={m}
              selected={m.id === selected.id}
              first={i === 0}
              onPress={() => choose(m)}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}

function MeterRow({
  meter,
  selected,
  first,
  onPress,
}: {
  meter: Meter;
  selected: boolean;
  first: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      className={cn(
        'min-h-[72px] flex-row items-center gap-4 px-5 py-3',
        !first && 'border-t border-border',
        selected ? 'bg-primary-soft' : 'active:bg-muted web:hover:bg-muted/50'
      )}>
      {meter.model ? (
        <View className="size-12 items-center justify-center rounded-2xl bg-primary-soft">
          <Icon as={GaugeIcon} className="size-6 text-primary" />
        </View>
      ) : null}
      <View className="flex-1 gap-0.5">
        <Text className={cn('text-lg', selected && 'font-semibold')}>{meter.name}</Text>
        {selected ? (
          <ReadStatus meter={meter} />
        ) : (
          <Text className="text-sm text-muted-foreground">{subtitle(meter)}</Text>
        )}
      </View>
      {selected ? <Icon as={CheckIcon} className="size-6 text-primary" /> : null}
    </Pressable>
  );
}

const subtitle = (m: Meter) =>
  m.model ? `${m.model} · ${m.ratedCurrent} A` : `${m.ratedCurrent} A nominal`;

/** The selected meter also says when it was last read. */
function ReadStatus({ meter }: { meter: Meter }) {
  const { readings, live } = useMeterContext();
  const now = useNow(1000);
  const failed = !!readings.error;
  return (
    <View className="flex-row items-center gap-1.5">
      <View
        className={cn(
          'size-2 rounded-full',
          failed ? 'bg-destructive' : live ? 'bg-ok' : 'bg-muted-foreground'
        )}
      />
      <Text className="shrink text-sm text-muted-foreground" numberOfLines={1}>
        {subtitle(meter)}
        {readings.updatedAt !== null ? ` · citit ${ago(readings.updatedAt, now)}` : ''}
      </Text>
    </View>
  );
}
