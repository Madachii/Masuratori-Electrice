import { THEME } from '@/lib/theme';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

/** Minimal trend line that fills the width of its parent. */
export function Sparkline({ data, height = 64 }: { data: number[]; height?: number }) {
  const [width, setWidth] = React.useState(0);
  const { colorScheme } = useColorScheme();
  const color = THEME[colorScheme ?? 'light'].accent;

  let chart = null;
  if (width > 0 && data.length > 1) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const pad = 4;
    const pts = data.map((v, i) => [
      (i / (data.length - 1)) * width,
      pad + (1 - (v - min) / span) * (height - 2 * pad),
    ]);
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const [lx, ly] = pts[pts.length - 1];
    chart = (
      <Svg width={width} height={height}>
        <Path d={`${line} L${width},${height} L0,${height} Z`} fill={color} fillOpacity={0.12} />
        <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={lx} cy={ly} r={3.5} fill={color} />
      </Svg>
    );
  }

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {chart}
    </View>
  );
}
