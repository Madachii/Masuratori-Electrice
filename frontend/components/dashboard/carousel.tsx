import { cn } from '@/lib/utils';
import * as React from 'react';
import {
  Pressable,
  ScrollView,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

/** Space between pages while swiping, split on both sides of each page. */
const GUTTER = 8;

/**
 * Pages that are swiped sideways, with dots underneath that show where you are and jump to a
 * page. Used on narrow screens, so groups of cards don't make the page very long.
 */
export function Carousel({ pages, label }: { pages: React.ReactNode[]; label: string }) {
  const ref = React.useRef<ScrollViewInstance>(null);
  const [width, setWidth] = React.useState(0);
  const [page, setPage] = React.useState(0);
  const count = pages.length;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0)
      setPage(Math.min(count - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / width))));
  };
  const goTo = (i: number) => ref.current?.scrollTo({ x: i * width, animated: true });

  // A page may disappear when its measurements are removed; don't point past the end.
  React.useEffect(() => {
    if (page >= count) setPage(Math.max(0, count - 1));
  }, [page, count]);

  return (
    <View className="gap-3">
      {/* Wider than the column by the gutter, so page content lines up with the rest of the page. */}
      <View style={{ marginHorizontal: -GUTTER }} onLayout={onLayout}>
        {width > 0 ? (
          <ScrollView
            ref={ref}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={32}
            accessibilityLabel={label}>
            {pages.map((p, i) => (
              <View
                key={i}
                style={{ width, paddingHorizontal: GUTTER }}
                accessibilityLabel={`${label}, pagina ${i + 1} din ${count}`}>
                {p}
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>

      {count > 1 ? (
        <View className="flex-row items-center justify-center gap-1" role="tablist">
          {pages.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => goTo(i)}
              role="tab"
              aria-selected={i === page}
              accessibilityLabel={`Pagina ${i + 1} din ${count}`}
              hitSlop={8}
              className="p-1">
              <View
                className={cn(
                  'h-1.5 rounded-full',
                  i === page ? 'w-5 bg-foreground' : 'w-1.5 bg-muted-foreground/40'
                )}
              />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Splits a list into pages of `size`. */
export const chunk = <T,>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, i * size + size)
  );
