import { ErrorTag } from '@/components/meter/reading';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { LABEL, de, rawText } from '@/lib/format';
import type { MeasurementId, Snapshot } from '@/lib/measurements';
import { cn } from '@/lib/utils';
import { CheckIcon, ChevronRightIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

/** Whether the last reading passed validation; the failed measurements are listed. */
export function ValidationBanner({
  snapshot,
  errors,
  onPress,
}: {
  snapshot: Snapshot;
  errors: MeasurementId[];
  onPress: () => void;
}) {
  const total = Object.keys(snapshot).length;
  if (total === 0) return null;
  const ok = errors.length === 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className={cn(
        'gap-4 rounded-2xl border p-4',
        ok ? 'border-transparent bg-ok-soft' : 'border-destructive/30 bg-destructive-soft'
      )}>
      <View className="flex-row items-center gap-3">
        <View
          className={cn(
            'size-9 items-center justify-center rounded-full',
            ok ? 'bg-ok' : 'bg-destructive'
          )}>
          {ok ? (
            <Icon as={CheckIcon} className="size-5 text-card" />
          ) : (
            <Text className="font-display-bold text-base text-card">!</Text>
          )}
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="font-semibold">
            {ok
              ? total === 1
                ? 'Mărimea citită este validă'
                : `Toate cele ${total} ${de(total)}mărimi sunt valide`
              : errors.length === 1
                ? 'O mărime a eșuat validarea'
                : `${errors.length} ${de(errors.length)}mărimi au eșuat validarea`}
          </Text>
          {ok ? null : (
            <Text className="text-sm text-muted-foreground">
              {total - errors.length} din {total} sunt valide
            </Text>
          )}
        </View>
        <Icon as={ChevronRightIcon} className="size-5 text-muted-foreground" />
      </View>

      {ok ? null : (
        <View className="gap-3">
          {errors.slice(0, 3).map((id) => (
            <View key={id} className="flex-row items-center gap-3 rounded-xl bg-card px-4 py-3">
              <View className="flex-1 gap-0.5">
                <Text className="font-semibold">{LABEL[id]}</Text>
                <Text className="text-sm text-muted-foreground">raw {rawText(snapshot[id]!)}</Text>
              </View>
              <ErrorTag m={snapshot[id]} className="self-center" />
            </View>
          ))}
          {errors.length > 3 ? (
            <Text className="text-sm text-muted-foreground">și încă {errors.length - 3}</Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}
