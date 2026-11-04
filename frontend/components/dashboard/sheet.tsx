import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** A panel that slides up from the bottom on phones and opens centred on wide screens. */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 700;

  return (
    <Modal
      visible={open}
      transparent
      animationType={wide ? 'fade' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent>
      <View className={cn('flex-1', wide ? 'items-center justify-center p-6' : 'justify-end')}>
        <Pressable
          className="absolute inset-0 bg-black/50"
          onPress={onClose}
          accessibilityLabel="Închide"
        />
        <View
          className={cn(
            'w-full border-border bg-background',
            wide ? 'max-w-[560px] rounded-xl border' : 'rounded-t-2xl border-t'
          )}
          style={{ maxHeight: height * (wide ? 0.8 : 0.85) }}>
          <View className="flex-row items-start gap-3 border-b border-border px-5 pb-4 pt-5">
            <View className="flex-1 gap-0.5">
              <Text className="font-display text-lg">{title}</Text>
              {subtitle ? <Text className="text-sm text-muted-foreground">{subtitle}</Text> : null}
            </View>
            <Button
              size="icon"
              variant="ghost"
              className="-mr-2 -mt-1"
              onPress={onClose}
              accessibilityLabel="Închide">
              <Icon as={XIcon} className="size-5" />
            </Button>
          </View>
          <ScrollView
            contentContainerClassName="gap-6 px-5 pt-4"
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** One choice in a sheet: a title, a line under it and something on the right. */
export function SheetOption({
  title,
  description,
  right,
  disabled,
  note,
  onPress,
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
  disabled?: boolean;
  /** Why the option can't be picked, shown instead of the description. */
  note?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={cn(
        'flex-row items-center gap-3 border-t border-border py-3 active:bg-accent web:hover:bg-accent/50',
        disabled && 'opacity-50'
      )}>
      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-medium">{title}</Text>
        {note || description ? (
          <Text className="text-xs text-muted-foreground">{note ?? description}</Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

export function SheetSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </Text>
      {children}
    </View>
  );
}
