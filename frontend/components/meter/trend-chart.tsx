import { Text } from '@/components/ui/text';
import { num } from '@/lib/format';
import { THEME } from '@/lib/theme';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

/** Up to this many values each one gets a dot, so sparse readings (weekly) stay visible. */
const DOTS_UP_TO = 40;

/** Rough width of one character of the axis labels (text-xs), to leave room for them. */
const CHAR_WIDTH = 7;

/**
 * Trend line with a filled area that fills the width of its parent.
 * With `axis` it also labels three values on the left and draws `nominal` as a dashed line.
 * With `times` (ms, same length as `data`) values are placed by when they were read, so gaps
 * between readings show; otherwise they are evenly spaced.
 */
export function TrendChart({
  data,
  times,
  height = 80,
  axis,
  nominal,
  decimals = 0,
}: {
  data: number[];
  times?: number[];
  height?: number;
  axis?: boolean;
  nominal?: number;
  decimals?: number;
}) {
  const [width, setWidth] = React.useState(0);
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme ?? 'light'];

  let lo = Math.min(...data, ...(nominal !== undefined ? [nominal] : []));
  let hi = Math.max(...data, ...(nominal !== undefined ? [nominal] : []));
  if (axis) {
    // Some room above and below, so the line doesn't touch the labels.
    const padding = (hi - lo || Math.abs(hi) * 0.02 || 1) * 0.25;
    lo -= padding;
    hi += padding;
  }
  const span = hi - lo || 1;
  const labels = axis ? [hi, (hi + lo) / 2, lo].map((g) => num(g, decimals)) : [];
  const left = axis ? Math.max(...labels.map((l) => l.length)) * CHAR_WIDTH + 8 : 0;
  // Room on the right for the last dot.
  const plot = Math.max(0, width - left - (axis ? 6 : 0));
  const inset = axis ? 8 : 4;
  const y = (v: number) => inset + (1 - (v - lo) / span) * (height - 2 * inset);

  let chart = null;
  if (plot > 0 && data.length > 1) {
    const t0 = times?.[0] ?? 0;
    const tSpan = times ? times[times.length - 1] - t0 || 1 : 1;
    const x = (i: number) =>
      left + (times ? (times[i] - t0) / tSpan : i / (data.length - 1)) * plot;
    const pts = data.map((v, i) => [x(i), y(v)]);
    const line = pts
      .map(([x, py], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${py.toFixed(1)}`)
      .join(' ');
    const grid = axis ? [hi, (hi + lo) / 2, lo] : [];
    chart = (
      <Svg width={width} height={height}>
        {grid.map((g, i) => (
          <Line
            key={i}
            x1={left}
            x2={width}
            y1={y(g)}
            y2={y(g)}
            stroke={t.border}
            strokeWidth={1}
          />
        ))}
        {nominal !== undefined ? (
          <Line
            x1={left}
            x2={width}
            y1={y(nominal)}
            y2={y(nominal)}
            stroke={t.mutedForeground}
            strokeOpacity={0.5}
            strokeDasharray="5 5"
          />
        ) : null}
        <Path
          d={`${line} L${left + plot},${height} L${left},${height} Z`}
          fill={t.primary}
          fillOpacity={colorScheme === 'dark' ? 0.18 : 0.12}
        />
        <Path
          d={line}
          stroke={t.primary}
          strokeWidth={2.5}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {axis && data.length <= DOTS_UP_TO
          ? pts.map(([px, py], i) => (
              <Circle
                key={i}
                cx={px}
                cy={py}
                r={3.5}
                fill={t.card}
                stroke={t.primary}
                strokeWidth={2}
              />
            ))
          : null}
      </Svg>
    );
  }

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {chart}
      {chart
        ? labels.map((label, i) => (
            <Text
              key={i}
              className="absolute left-0 text-xs text-muted-foreground"
              style={{ top: y([hi, (hi + lo) / 2, lo][i]) - 8 }}>
              {label}
            </Text>
          ))
        : null}
    </View>
  );
}

/** Shown in place of a chart while there aren't two values to draw yet. */
export function NoTrend({ height = 80, text }: { height?: number; text: string }) {
  return (
    <View
      style={{ height }}
      className="items-center justify-center rounded-2xl border border-dashed border-border px-4">
      <Text className="text-center text-sm text-muted-foreground">{text}</Text>
    </View>
  );
}
