import { Sheet, SheetOption, SheetSection } from '@/components/dashboard/sheet';
import { Reading } from '@/components/meter/reading';
import { MEASUREMENT_GROUPS } from '@/lib/dashboard';
import { DESCRIPTION, LABEL } from '@/lib/format';
import type { MeasurementId, Snapshot } from '@/lib/measurements';

/**
 * Picks one measurement, grouped by kind, with its current value so the user sees what they add.
 * Measurements the current source doesn't send (the real meter reads only some) can't be picked.
 */
export function MeasurementPicker({
  open,
  onClose,
  onPick,
  title,
  subtitle,
  taken = [],
  snapshot,
  available,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (id: MeasurementId) => void;
  title: string;
  subtitle?: string;
  /** Already in the group: shown, but not offered again. */
  taken?: MeasurementId[];
  snapshot: Snapshot;
  /** What the source sends; null while that isn't known yet. */
  available: Set<MeasurementId> | null;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={subtitle}>
      {MEASUREMENT_GROUPS.map((g) => (
        <SheetSection key={g.title} title={g.title}>
          {g.ids.map((id) => {
            const missing = available !== null && !available.has(id);
            const inGroup = taken.includes(id);
            return (
              <SheetOption
                key={id}
                title={LABEL[id]}
                description={DESCRIPTION[id]}
                disabled={missing || inGroup}
                note={
                  inGroup
                    ? 'Deja în grup'
                    : missing
                      ? 'Contorul nu transmite această mărime'
                      : undefined
                }
                right={<Reading m={snapshot[id]} size="sm" />}
                onPress={() => {
                  onPick(id);
                  onClose();
                }}
              />
            );
          })}
        </SheetSection>
      ))}
    </Sheet>
  );
}
