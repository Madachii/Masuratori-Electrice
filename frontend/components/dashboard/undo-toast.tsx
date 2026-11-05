import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { Undo } from '@/hooks/use-dashboard-layout';
import * as React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const VISIBLE_MS = 6000;

/** "Modul eliminat · Anulează" at the bottom of the screen, for a few seconds. */
export function UndoToast({
  undo,
  onUndo,
  onDismiss,
}: {
  undo: Undo | null;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (!undo) return;
    const id = setTimeout(onDismiss, VISIBLE_MS);
    return () => clearTimeout(id);
  }, [undo, onDismiss]);

  if (!undo) return null;
  return (
    <View
      className="absolute inset-x-0 items-center px-4"
      style={{ bottom: insets.bottom + 16 }}
      pointerEvents="box-none">
      <View
        className="w-full max-w-[480px] flex-row items-center gap-3 rounded-lg bg-foreground py-2 pl-4 pr-2 shadow-lg shadow-black/20"
        accessibilityLiveRegion="polite"
        role="status">
        <Text className="flex-1 text-sm text-background">{undo.message}</Text>
        <Button size="sm" variant="ghost" onPress={onUndo}>
          <Text className="font-semibold text-background">Anulează</Text>
        </Button>
      </View>
    </View>
  );
}
