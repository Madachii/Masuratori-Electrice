import { DashboardEditor } from '@/components/dashboard/dashboard-editor';
import {
  CARD_FLEX,
  ModuleBody,
  toRows,
  type ModuleContext,
} from '@/components/dashboard/module-body';
import { UndoToast } from '@/components/dashboard/undo-toast';
import { ReadClock } from '@/components/meter/read-clock';
import { ValidationBanner } from '@/components/meter/validation-banner';
import { Screen } from '@/components/screen';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { POLL_MS, useMeterContext } from '@/hooks/meter-context';
import { useDashboardLayout } from '@/hooks/use-dashboard-layout';
import { LOCATION } from '@/lib/meters';
import { cn } from '@/lib/utils';
import { router } from 'expo-router';
import {
  CheckIcon,
  ChevronDownIcon,
  LayoutDashboardIcon,
  SlidersHorizontalIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';

export default function Home() {
  const { meter, meters, readings, live, available, errors } = useMeterContext();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const layout = useDashboardLayout();
  const [editing, setEditing] = React.useState(false);
  const ctx: ModuleContext = {
    snapshot: readings.snapshot,
    history: readings.history,
    intervalMs: POLL_MS,
    live,
    meter,
    wide,
  };

  return (
    <Screen
      contentClassName={editing ? 'pb-32' : undefined}
      after={
        <UndoToast undo={layout.undo} onUndo={layout.undoLast} onDismiss={layout.dismissUndo} />
      }>
      <View className="gap-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="text-sm text-muted-foreground">{LOCATION}</Text>
            <Pressable
              onPress={() => router.navigate('/contoare')}
              disabled={meters.length < 2}
              accessibilityRole="button"
              accessibilityLabel={`${meter.name}, schimbă contorul`}
              className="flex-row items-center gap-2 self-start">
              <Text className="font-display-bold text-4xl tracking-tight">{meter.name}</Text>
              {meters.length > 1 ? (
                <Icon as={ChevronDownIcon} className="mt-1 size-6 text-muted-foreground" />
              ) : null}
            </Pressable>
          </View>
          <View className="flex-row items-center gap-2 pt-4">
            <Button
              variant={editing ? 'default' : 'outline'}
              size={wide ? 'default' : 'icon'}
              className={cn('rounded-full', wide && 'px-5')}
              onPress={() => setEditing((e) => !e)}
              accessibilityLabel={
                editing ? 'Gata cu personalizarea' : 'Personalizează dashboard-ul'
              }>
              <Icon
                as={editing ? CheckIcon : SlidersHorizontalIcon}
                className={cn('size-4', !wide && 'size-5', editing && 'text-primary-foreground')}
              />
              {wide ? <Text>{editing ? 'Gata' : 'Personalizează'}</Text> : null}
            </Button>
            <ThemeToggle />
          </View>
        </View>
        <ReadClock
          updatedAt={readings.updatedAt}
          polledAt={readings.polledAt}
          intervalMs={POLL_MS}
          error={readings.error}
        />
      </View>

      {editing ? null : (
        <ValidationBanner
          snapshot={readings.snapshot}
          errors={errors}
          onPress={() =>
            router.navigate({
              pathname: '/marimi',
              params: { filtru: errors.length ? 'erori' : 'toate' },
            })
          }
        />
      )}

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
    </Screen>
  );
}

function EmptyDashboard({ onEdit }: { onEdit: () => void }) {
  return (
    <View className="items-center gap-4 rounded-3xl border border-dashed border-border px-6 py-16">
      <Icon as={LayoutDashboardIcon} className="size-8 text-muted-foreground" />
      <View className="items-center gap-1">
        <Text className="font-display text-lg">Dashboard-ul e gol</Text>
        <Text className="text-center text-sm text-muted-foreground">
          Adaugă modulele pe care vrei să le urmărești.
        </Text>
      </View>
      <Button onPress={onEdit} className="rounded-full">
        <Icon as={SlidersHorizontalIcon} className="size-4 text-primary-foreground" />
        <Text>Personalizează</Text>
      </Button>
    </View>
  );
}
