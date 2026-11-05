import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Scrolling page with the app's side margins and a readable maximum width. */
export function Screen({
  children,
  after,
  contentClassName,
}: {
  children: React.ReactNode;
  /** Drawn over the page, outside the scroll (e.g. a toast). */
  after?: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName={cn('px-4 pb-12 pt-6 md:px-8', contentClassName)}>
        <View className="w-full max-w-[1200px] gap-6 self-center">{children}</View>
      </ScrollView>
      {after}
    </SafeAreaView>
  );
}

/** Large page title with an optional line above or below it. */
export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="gap-1">
      <Text className="font-display-bold text-4xl tracking-tight">{title}</Text>
      {subtitle ? <Text className="text-muted-foreground">{subtitle}</Text> : null}
    </View>
  );
}
