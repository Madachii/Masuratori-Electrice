import { ErrorTag, Reading } from '@/components/meter/reading';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { DESCRIPTION, LABEL } from '@/lib/format';
import { MEASUREMENTS, type MeasurementId, type Snapshot } from '@/lib/measurements';
import * as React from 'react';
import { View } from 'react-native';

const GROUPS: { title: string; note?: string; ids: MeasurementId[] }[] = [
  { title: 'Curenți', ids: ['I_L1', 'I_L2', 'I_L3', 'I_N', 'I_G'] },
  { title: 'Tensiuni', ids: ['U_L1N', 'U_L2N', 'U_L3N', 'U_L1L2', 'U_L2L3', 'U_L3L1'] },
  { title: 'Putere și rețea', ids: ['P_ACTIVE', 'P_REACTIVE', 'P_APPARENT', 'PF', 'FREQ'] },
  { title: 'Energie', ids: ['E_ACTIVE_COMB', 'E_ACTIVE_FWD', 'E_ACTIVE_REV', 'E_APPARENT'] },
  {
    title: 'Cerere',
    note: 'Media pe intervalul de cerere și cea mai mare valoare înregistrată',
    ids: ['DEMAND_ACTIVE', 'DEMAND_REACTIVE', 'DEMAND_APPARENT', 'PEAK_ACTIVE', 'PEAK_REACTIVE', 'PEAK_APPARENT'],
  },
];

/** Every measurement with what it means, its value and whether it passed validation. */
export function MeasurementList({ snapshot, wide }: { snapshot: Snapshot; wide: boolean }) {
  const [onlyErrors, setOnlyErrors] = React.useState(false);
  const isError = (id: MeasurementId) => !!snapshot[id] && !snapshot[id]!.valid;
  const errors = MEASUREMENTS.filter((d) => isError(d.id)).length;
  const groups = GROUPS.map((g) => ({ ...g, ids: onlyErrors ? g.ids.filter(isError) : g.ids })).filter(
    (g) => g.ids.length > 0
  );

  return (
    <View className="gap-4">
      <View className="flex-row gap-2">
        <Button size="sm" variant={onlyErrors ? 'outline' : 'secondary'} onPress={() => setOnlyErrors(false)}>
          <Text>Toate ({MEASUREMENTS.length})</Text>
        </Button>
        <Button size="sm" variant={onlyErrors ? 'secondary' : 'outline'} onPress={() => setOnlyErrors(true)}>
          <Text>Erori ({errors})</Text>
        </Button>
      </View>

      {groups.length === 0 ? (
        <Text variant="muted">Nicio eroare în ultima citire.</Text>
      ) : (
        <View className="flex-row flex-wrap gap-x-12 gap-y-8">
          {groups.map((g) => (
            <View key={g.title} className={wide ? 'min-w-[40%] flex-1' : 'w-full'}>
              <View className="gap-0.5 pb-2">
                <Text className="font-display text-base">{g.title}</Text>
                {g.note ? <Text className="text-xs text-muted-foreground">{g.note}</Text> : null}
              </View>
              {g.ids.map((id) => (
                <Row key={id} id={id} snapshot={snapshot} />
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Row({ id, snapshot }: { id: MeasurementId; snapshot: Snapshot }) {
  const m = snapshot[id];
  return (
    <View className="flex-row items-center gap-3 border-t border-border py-3">
      <View className="flex-1 gap-0.5">
        <Text className="text-sm">{LABEL[id]}</Text>
        {DESCRIPTION[id] ? <Text className="text-xs text-muted-foreground">{DESCRIPTION[id]}</Text> : null}
      </View>
      <View className="items-end gap-1">
        <Reading m={m} size="sm" />
        <ErrorTag m={m} className="self-end" />
      </View>
    </View>
  );
}
