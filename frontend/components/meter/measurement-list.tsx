import { ErrorTag, Reading } from '@/components/meter/reading';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { MEASUREMENT_GROUPS } from '@/lib/dashboard';
import { LABEL, rawText } from '@/lib/format';
import type { MeasurementId, Snapshot } from '@/lib/measurements';
import { openMeasurement } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { ChevronRightIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

export type Filter = 'all' | 'errors';

/**
 * Every measurement the source sends, grouped by kind, each opening its detail screen.
 * `available` is null until the first reading, when every measurement is listed.
 */
export function MeasurementList({
  snapshot,
  available,
  wide,
  filter,
  onFilter,
}: {
  snapshot: Snapshot;
  available: Set<MeasurementId> | null;
  wide: boolean;
  filter: Filter;
  onFilter: (filter: Filter) => void;
}) {
  const isError = (id: MeasurementId) => !!snapshot[id] && !snapshot[id]!.valid;
  const all = MEASUREMENT_GROUPS.flatMap((g) => g.ids).filter(
    (id) => !available || available.has(id)
  );
  const errors = all.filter(isError).length;
  const groups = MEASUREMENT_GROUPS.map((g) => ({
    ...g,
    ids: g.ids.filter(
      (id) => (!available || available.has(id)) && (filter === 'all' || isError(id))
    ),
  })).filter((g) => g.ids.length > 0);
  // Two fixed columns on wide screens, so an odd group out doesn't stretch across the page.
  const columns = wide
    ? [groups.filter((_, i) => i % 2 === 0), groups.filter((_, i) => i % 2 === 1)]
    : [groups];

  return (
    <View className="gap-6">
      <Segmented
        value={filter}
        onChange={onFilter}
        options={[
          { value: 'all', label: `Toate (${all.length})` },
          { value: 'errors', label: `Erori (${errors})` },
        ]}
      />

      {groups.length === 0 ? (
        <Card className="items-center p-8">
          <Text className="text-muted-foreground">Nicio eroare în ultima citire</Text>
        </Card>
      ) : (
        <View className={wide ? 'flex-row items-start gap-6' : 'gap-6'}>
          {columns.map((column, c) => (
            <View key={c} className={cn('gap-6', wide && 'flex-1')}>
              {column.map((g) => (
                <View key={g.title} className="gap-3">
                  <Text className="font-display-bold text-xl tracking-tight">{g.title}</Text>
                  <Card className="gap-0 overflow-hidden p-0">
                    {g.ids.map((id, i) => (
                      <Row key={id} id={id} snapshot={snapshot} first={i === 0} />
                    ))}
                  </Card>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Row({ id, snapshot, first }: { id: MeasurementId; snapshot: Snapshot; first: boolean }) {
  const m = snapshot[id];
  const invalid = m && !m.valid;
  return (
    <Pressable
      onPress={() => openMeasurement(id)}
      accessibilityRole="button"
      className={cn(
        'min-h-[60px] flex-row items-center gap-3 py-3 pl-5 pr-4 active:bg-muted web:hover:bg-muted/50',
        !first && 'border-t border-border'
      )}>
      <View className="flex-1 gap-0.5">
        <Text>{LABEL[id]}</Text>
        {invalid ? <Text className="text-sm text-muted-foreground">raw {rawText(m)}</Text> : null}
      </View>
      {invalid ? <ErrorTag m={m} className="self-center" /> : <Reading m={m} size="sm" />}
      <Icon as={ChevronRightIcon} className="size-5 text-muted-foreground" />
    </Pressable>
  );
}

/** Two or three options in a rounded track; the selected one is raised. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'default',
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  size?: 'default' | 'sm';
}) {
  return (
    <View className="flex-row rounded-2xl bg-muted p-1" role="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            role="tab"
            aria-selected={selected}
            className={cn(
              'flex-1 items-center rounded-xl shadow-sm shadow-transparent',
              size === 'sm' ? 'py-1.5' : 'py-2.5',
              selected && 'bg-card shadow-black/10'
            )}>
            <Text
              className={cn(
                'font-semibold',
                size === 'sm' && 'text-sm',
                selected ? 'text-foreground' : 'text-muted-foreground'
              )}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
