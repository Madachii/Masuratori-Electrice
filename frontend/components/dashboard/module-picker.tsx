import { Sheet, SheetOption, SheetSection } from '@/components/dashboard/sheet';
import { Icon } from '@/components/ui/icon';
import {
  MODULE_DESCRIPTION,
  MODULE_TITLE,
  STATS_TEMPLATES,
  newKey,
  type DashboardModule,
  type FixedModuleType,
} from '@/lib/dashboard';
import { LABEL } from '@/lib/format';
import type { MeasurementId } from '@/lib/measurements';
import { PlusIcon } from 'lucide-react-native';

const FIXED: FixedModuleType[] = ['energy', 'power', 'phases'];

/** Lists the modules that can be added, or put in place of an existing one. */
export function ModulePicker({
  open,
  onClose,
  onPick,
  title,
  subtitle,
  present,
  available,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (module: DashboardModule) => void;
  title: string;
  subtitle?: string;
  /** Module types already on the dashboard; the fixed ones appear only once. */
  present: Set<DashboardModule['type']>;
  available: Set<MeasurementId> | null;
}) {
  const pick = (module: DashboardModule) => {
    onPick(module);
    onClose();
  };
  const plus = <Icon as={PlusIcon} className="size-4 text-muted-foreground" />;

  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={subtitle}>
      <SheetSection title="Module">
        {FIXED.map((type) => (
          <SheetOption
            key={type}
            title={MODULE_TITLE[type]}
            description={MODULE_DESCRIPTION[type]}
            disabled={present.has(type)}
            note={present.has(type) ? 'Deja pe dashboard' : undefined}
            right={plus}
            onPress={() => pick({ key: newKey(type), type })}
          />
        ))}
      </SheetSection>

      <SheetSection title="Grupuri de mărimi">
        {STATS_TEMPLATES.map((t) => {
          // Only what the source sends; a group with nothing to show isn't offered.
          const ids = available ? t.ids.filter((id) => available.has(id)) : t.ids;
          return (
            <SheetOption
              key={t.title}
              title={t.title}
              description={ids.map((id) => LABEL[id]).join(' · ')}
              disabled={ids.length === 0}
              note={ids.length === 0 ? 'Contorul nu transmite aceste mărimi' : undefined}
              right={plus}
              onPress={() => pick({ key: newKey('stats'), type: 'stats', title: t.title, ids })}
            />
          );
        })}
        <SheetOption
          title="Grup gol"
          description="Alegi tu mărimile, una câte una"
          right={plus}
          onPress={() =>
            pick({ key: newKey('stats'), type: 'stats', title: 'Mărimile mele', ids: [] })
          }
        />
      </SheetSection>
    </Sheet>
  );
}
