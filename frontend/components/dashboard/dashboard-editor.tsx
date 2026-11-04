import { MeasurementPicker } from '@/components/dashboard/measurement-picker';
import { ModulePicker } from '@/components/dashboard/module-picker';
import { Reading } from '@/components/meter/reading';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { Text } from '@/components/ui/text';
import type { useDashboardLayout } from '@/hooks/use-dashboard-layout';
import {
  MAX_STATS,
  MODULE_DESCRIPTION,
  PRESETS,
  moduleTitle,
  type DashboardModule,
} from '@/lib/dashboard';
import { LABEL } from '@/lib/format';
import type { MeasurementId, Snapshot } from '@/lib/measurements';
import { cn } from '@/lib/utils';
import {
  ArrowDownIcon,
  ArrowLeftRightIcon,
  ArrowUpIcon,
  CheckIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { FadeIn, FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';

type Layout = ReturnType<typeof useDashboardLayout>;

type Picker =
  | { kind: 'add-module' }
  | { kind: 'replace-module'; module: DashboardModule }
  | { kind: 'add-measurement'; module: DashboardModule & { type: 'stats' } }
  | { kind: 'replace-measurement'; module: DashboardModule & { type: 'stats' }; id: MeasurementId };

/**
 * The dashboard in edit mode: every module as a compact card that can be moved, replaced or
 * removed, groups of measurements edited in place, and ready-made layouts to start from.
 */
export function DashboardEditor({
  layout: l,
  snapshot,
  available,
}: {
  layout: Layout;
  snapshot: Snapshot;
  available: Set<MeasurementId> | null;
}) {
  const [picker, setPicker] = React.useState<Picker | null>(null);
  const close = React.useCallback(() => setPicker(null), []);
  const modules = l.layout.modules;
  const present = new Set(modules.map((m) => m.type));

  return (
    <View className="gap-8">
      <View className="gap-3">
        <View className="gap-0.5">
          <Text className="font-display text-xl tracking-tight">Configurații gata făcute</Text>
          <Text className="text-sm text-muted-foreground">
            Pornește de la una și schimb-o după nevoie. Poți anula orice modificare.
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-3">
          {PRESETS.map((p) => {
            const active = l.layout.preset === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => l.applyPreset(p.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                className={cn(
                  'min-w-[220px] flex-1 gap-1 rounded-lg border p-4 active:bg-accent web:hover:bg-accent/50',
                  active ? 'border-foreground bg-card' : 'border-border'
                )}>
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="font-display text-base">{p.title}</Text>
                  {active ? <Icon as={CheckIcon} className="size-4 text-primary" /> : null}
                </View>
                <Text className="text-xs text-muted-foreground">{p.description}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-3">
        <View className="flex-row items-baseline justify-between gap-4">
          <Text className="font-display text-xl tracking-tight">Module</Text>
          <Text className="text-sm text-muted-foreground">
            {modules.length === 1 ? 'un modul' : `${modules.length} module`}
          </Text>
        </View>

        {modules.map((m, i) => (
          <NativeOnlyAnimatedView
            key={m.key}
            layout={LinearTransition.reduceMotion(ReduceMotion.System)}
            entering={FadeIn.reduceMotion(ReduceMotion.System)}
            exiting={FadeOut.reduceMotion(ReduceMotion.System)}>
            <ModuleCard
              module={m}
              first={i === 0}
              last={i === modules.length - 1}
              snapshot={snapshot}
              layout={l}
              onPick={setPicker}
            />
          </NativeOnlyAnimatedView>
        ))}

        <Pressable
          onPress={() => setPicker({ kind: 'add-module' })}
          accessibilityRole="button"
          className="flex-row items-center justify-center gap-2 rounded-lg border border-dashed border-border py-5 active:bg-accent web:hover:bg-accent/50">
          <Icon as={PlusIcon} className="size-4" />
          <Text className="font-medium">Adaugă modul</Text>
        </Pressable>
      </View>

      <ModulePicker
        open={picker?.kind === 'add-module' || picker?.kind === 'replace-module'}
        onClose={close}
        title={picker?.kind === 'replace-module' ? 'Înlocuiește modulul' : 'Adaugă un modul'}
        subtitle={
          picker?.kind === 'replace-module'
            ? `Noul modul ia locul lui „${moduleTitle(picker.module)}”`
            : 'Apare la sfârșitul dashboard-ului; îl poți muta apoi'
        }
        present={present}
        available={available}
        onPick={(module) =>
          picker?.kind === 'replace-module' ? l.replace(picker.module.key, module) : l.add(module)
        }
      />

      <MeasurementPicker
        open={picker?.kind === 'add-measurement' || picker?.kind === 'replace-measurement'}
        onClose={close}
        title={
          picker?.kind === 'replace-measurement'
            ? `Înlocuiește „${LABEL[picker.id]}”`
            : 'Adaugă o mărime'
        }
        subtitle={
          picker?.kind === 'add-measurement' || picker?.kind === 'replace-measurement'
            ? `În grupul „${picker.module.title || 'Fără titlu'}”`
            : undefined
        }
        taken={
          picker?.kind === 'add-measurement' || picker?.kind === 'replace-measurement'
            ? picker.module.ids
            : []
        }
        snapshot={snapshot}
        available={available}
        onPick={(id) => {
          if (picker?.kind === 'replace-measurement')
            l.replaceMeasurement(picker.module.key, picker.id, id);
          else if (picker?.kind === 'add-measurement') l.addMeasurement(picker.module.key, id);
        }}
      />
    </View>
  );
}

function ModuleCard({
  module: m,
  first,
  last,
  snapshot,
  layout: l,
  onPick,
}: {
  module: DashboardModule;
  first: boolean;
  last: boolean;
  snapshot: Snapshot;
  layout: Layout;
  onPick: (p: Picker) => void;
}) {
  const title = moduleTitle(m);
  return (
    <View className="gap-3 rounded-lg border border-border bg-card p-4">
      <View className="flex-row items-center gap-2">
        {m.type === 'stats' ? (
          <TextInput
            value={m.title}
            onChangeText={(t) => l.rename(m.key, t)}
            placeholder="Fără titlu"
            maxLength={40}
            accessibilityLabel="Titlul grupului"
            className="-ml-2 min-w-0 flex-1 rounded-md px-2 py-1 font-display text-base text-foreground placeholder:text-muted-foreground web:outline-none web:focus:bg-accent/50"
          />
        ) : (
          <Text className="flex-1 font-display text-base">{title}</Text>
        )}
        <IconButton
          icon={ArrowUpIcon}
          label={`Mută „${title}” mai sus`}
          disabled={first}
          onPress={() => l.move(m.key, -1)}
        />
        <IconButton
          icon={ArrowDownIcon}
          label={`Mută „${title}” mai jos`}
          disabled={last}
          onPress={() => l.move(m.key, 1)}
        />
        <IconButton
          icon={ArrowLeftRightIcon}
          label={`Înlocuiește „${title}”`}
          onPress={() => onPick({ kind: 'replace-module', module: m })}
        />
        <IconButton
          icon={Trash2Icon}
          label={`Elimină „${title}”`}
          destructive
          onPress={() => l.remove(m.key)}
        />
      </View>

      {m.type === 'stats' ? (
        <View className="flex-row flex-wrap gap-2">
          {m.ids.map((id) => (
            <View
              key={id}
              className="flex-row items-center overflow-hidden rounded-md border border-border bg-background">
              <Pressable
                onPress={() => onPick({ kind: 'replace-measurement', module: m, id })}
                accessibilityRole="button"
                accessibilityLabel={`Înlocuiește ${LABEL[id]}`}
                className="gap-0.5 py-2 pl-3 pr-2 active:bg-accent web:hover:bg-accent/50">
                <Text className="text-xs text-muted-foreground">{LABEL[id]}</Text>
                <Reading m={snapshot[id]} size="sm" />
              </Pressable>
              <Pressable
                onPress={() => l.removeMeasurement(m.key, id)}
                accessibilityRole="button"
                accessibilityLabel={`Scoate ${LABEL[id]} din grup`}
                className="justify-center self-stretch border-l border-border px-2.5 active:bg-accent web:hover:bg-destructive/10">
                <Icon as={XIcon} className="size-3.5 text-muted-foreground" />
              </Pressable>
            </View>
          ))}
          {m.ids.length < MAX_STATS ? (
            <Pressable
              onPress={() => onPick({ kind: 'add-measurement', module: m })}
              accessibilityRole="button"
              className="min-h-[52px] flex-row items-center gap-1.5 rounded-md border border-dashed border-border px-3 active:bg-accent web:hover:bg-accent/50">
              <Icon as={PlusIcon} className="size-3.5" />
              <Text className="text-sm">Mărime</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Text className="text-sm text-muted-foreground">{MODULE_DESCRIPTION[m.type]}</Text>
      )}
    </View>
  );
}

function IconButton({
  icon,
  label,
  disabled,
  destructive,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>['as'];
  label: string;
  disabled?: boolean;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      size="icon"
      variant="ghost"
      disabled={disabled}
      onPress={onPress}
      accessibilityLabel={label}
      className={cn('size-10 sm:size-9', disabled && 'opacity-30')}>
      <Icon as={icon} className={cn('size-4', destructive && 'text-destructive')} />
    </Button>
  );
}
