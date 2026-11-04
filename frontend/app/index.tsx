import { DashboardEditor } from '@/components/dashboard/dashboard-editor';
import {
  ModuleBody,
  CARD_FLEX,
  toRows,
  type ModuleContext,
} from '@/components/dashboard/module-body';
import { UndoToast } from '@/components/dashboard/undo-toast';
import { MeterSelect } from '@/components/meter/meter-select';
import { ReadClock } from '@/components/meter/read-clock';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useDashboardLayout } from '@/hooks/use-dashboard-layout';
import { useMeter } from '@/hooks/use-meter';
import { API_URL, createApiSource } from '@/lib/api';
import type { MeasurementId } from '@/lib/measurements';
import { LIVE_METER, LOCATION, METERS, maxPowerW } from '@/lib/meters';
import { createMockSource } from '@/lib/mock-meter';
import { cn } from '@/lib/utils';
import { CheckIcon, LayoutDashboardIcon, SlidersHorizontalIcon } from 'lucide-react-native';
import * as React from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const POLL_MS = 5000;
// With a backend configured we show the one meter it serves; otherwise simulated meters.
const AVAILABLE = API_URL ? [LIVE_METER] : METERS;

export default function Dashboard() {
  const [meter, setMeter] = React.useState(AVAILABLE[0]);
  const source = React.useMemo(
    () => (API_URL ? createApiSource() : createMockSource(meter)),
    [meter]
  );
  const readings = useMeter(source, POLL_MS, maxPowerW(meter));
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const layout = useDashboardLayout();
  const [editing, setEditing] = React.useState(false);
  // What the source sends: the real meter reads only some measurements, the simulator all of them.
  const available = React.useMemo(() => {
    const ids = Object.keys(readings.snapshot) as MeasurementId[];
    return ids.length ? new Set(ids) : null;
  }, [readings.snapshot]);
  const ctx: ModuleContext = {
    snapshot: readings.snapshot,
    history: readings.history,
    intervalMs: POLL_MS,
    meter,
    wide,
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView contentContainerClassName={cn('px-4 pt-6 md:px-8', editing ? 'pb-32' : 'pb-16')}>
        <View className="w-full max-w-[1200px] gap-8 self-center">
          <View className="gap-4">
            <View className={cn('gap-4', wide && 'flex-row items-end justify-between')}>
              <View className="gap-1">
                <Text className="text-sm text-muted-foreground">{LOCATION}</Text>
                <Text className="font-display-bold text-3xl tracking-tight md:text-4xl">
                  {meter.name}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className={wide ? 'w-[260px]' : 'flex-1'}>
                  <MeterSelect
                    meters={AVAILABLE}
                    value={meter}
                    onChange={setMeter}
                    className="w-full"
                  />
                </View>
                <Button
                  variant={editing ? 'default' : 'outline'}
                  size={wide ? 'default' : 'icon'}
                  className={cn(!wide && 'rounded-full')}
                  onPress={() => setEditing((e) => !e)}
                  accessibilityLabel={
                    editing ? 'Gata cu personalizarea' : 'Personalizează dashboard-ul'
                  }>
                  <Icon
                    as={editing ? CheckIcon : SlidersHorizontalIcon}
                    className={cn('size-4', !wide && 'size-5')}
                  />
                  {wide ? <Text>{editing ? 'Gata' : 'Personalizează'}</Text> : null}
                </Button>
                <ThemeToggle />
              </View>
            </View>
            <View className={wide ? 'flex-row items-start gap-4' : 'gap-2'}>
              <View className={wide ? 'w-[380px]' : undefined}>
                <ReadClock
                  updatedAt={readings.updatedAt}
                  polledAt={readings.polledAt}
                  intervalMs={POLL_MS}
                  error={readings.error}
                />
              </View>
              {API_URL ? null : (
                <Badge variant="outline" className="self-start">
                  <Text>date simulate</Text>
                </Badge>
              )}
            </View>
          </View>

          {!layout.loaded ? null : editing ? (
            <DashboardEditor layout={layout} snapshot={readings.snapshot} available={available} />
          ) : layout.layout.modules.length === 0 ? (
            <EmptyDashboard onEdit={() => setEditing(true)} />
          ) : (
            toRows(layout.layout.modules, wide).map((row) =>
              row.length === 1 ? (
                <ModuleBody key={row[0].key} module={row[0]} ctx={ctx} />
              ) : (
                <View key={row.map((m) => m.key).join('+')} className="flex-row gap-4">
                  {row.map((m) => (
                    <ModuleBody key={m.key} module={m} ctx={ctx} className={CARD_FLEX[m.type]} />
                  ))}
                </View>
              )
            )
          )}
        </View>
      </ScrollView>
      <UndoToast undo={layout.undo} onUndo={layout.undoLast} onDismiss={layout.dismissUndo} />
    </SafeAreaView>
  );
}

function EmptyDashboard({ onEdit }: { onEdit: () => void }) {
  return (
    <View className="items-center gap-4 rounded-xl border border-dashed border-border px-6 py-16">
      <Icon as={LayoutDashboardIcon} className="size-8 text-muted-foreground" />
      <View className="items-center gap-1">
        <Text className="font-display text-lg">Dashboard-ul e gol</Text>
        <Text className="text-center text-sm text-muted-foreground">
          Adaugă modulele pe care vrei să le urmărești sau pornește de la o configurație gata
          făcută.
        </Text>
      </View>
      <Button onPress={onEdit}>
        <Icon as={SlidersHorizontalIcon} className="size-4 text-primary-foreground" />
        <Text>Personalizează</Text>
      </Button>
    </View>
  );
}
