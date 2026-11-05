import { Segmented } from '@/components/meter/measurement-list';
import { span } from '@/components/meter/power-card';
import { Pill, Reading, SectionHeading } from '@/components/meter/reading';
import { BandScale, LoadBar, PHASE_BG } from '@/components/meter/scales';
import { NoTrend, TrendChart } from '@/components/meter/trend-chart';
import { Screen } from '@/components/screen';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { POLL_MS, useMeterContext } from '@/hooks/meter-context';
import { useBackendSeries, type SeriesRange } from '@/hooks/use-series';
import { MEASUREMENT_GROUPS } from '@/lib/dashboard';
import { ERROR_LABEL, LABEL, clock, de, num, rawText, seriesScale, shortDate } from '@/lib/format';
import {
  CROSS_CHECKED,
  DEF_BY_ID,
  type Measurement,
  type MeasurementDef,
  type MeasurementId,
  type ValidationError,
} from '@/lib/measurements';
import { PHASE_CURRENTS, bandFor, inBand, phaseOf } from '@/lib/ranges';
import { cn } from '@/lib/utils';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckIcon, ChevronLeftIcon, MinusIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

export default function MeasurementDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const def = id && id in DEF_BY_ID ? DEF_BY_ID[id as MeasurementId] : null;

  return (
    <Screen>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.navigate('/marimi'))}
        accessibilityRole="link"
        className="-ml-1 flex-row items-center gap-1 self-start py-1">
        <Icon as={ChevronLeftIcon} className="size-6 text-primary" />
        <Text className="text-lg font-semibold text-primary">Mărimi</Text>
      </Pressable>
      {def ? (
        <Detail def={def} />
      ) : (
        <Text className="text-muted-foreground">Mărime necunoscută.</Text>
      )}
    </Screen>
  );
}

function Detail({ def }: { def: MeasurementDef }) {
  const { readings, loading, meter } = useMeterContext();
  const m = readings.snapshot[def.id];
  const phase = phaseOf(def.id);
  const group = MEASUREMENT_GROUPS.find((g) => g.ids.includes(def.id))?.title;

  return (
    <>
      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          {phase ? <View className={cn('size-3.5 rounded-[3px]', PHASE_BG[phase])} /> : null}
          <Text className="font-semibold text-muted-foreground">
            {phase ? `Faza L${phase}` : group}
          </Text>
        </View>
        <Text className="font-display-bold text-4xl tracking-tight">{LABEL[def.id]}</Text>
      </View>

      {!m && !loading ? (
        <Card className="p-6">
          <Text className="text-muted-foreground">Contorul nu trimite această mărime.</Text>
        </Card>
      ) : (
        <>
          <ValueCard def={def} m={m} ratedCurrent={meter.ratedCurrent} />
          <TrendCard def={def} />
          {m ? <Checks def={def} m={m} /> : null}
        </>
      )}
    </>
  );
}

function ValueCard({
  def,
  m,
  ratedCurrent,
}: {
  def: MeasurementDef;
  m?: Measurement;
  ratedCurrent: number;
}) {
  const band = bandFor(def.id);
  const value = m?.valid ? m.value : null;
  const note = [
    band && value !== null ? `${inBand(band, value) ? 'În' : 'În afara'} ${band.label}` : null,
    m ? `citit la ${clock(m.timestamp)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card className="gap-5 p-6">
      <View className="flex-row items-start justify-between gap-3">
        <Reading m={m} size="2xl" className="flex-1" />
        {m ? (
          m.valid ? (
            <Pill tone="ok" icon={<Icon as={CheckIcon} className="size-4 text-ok" />}>
              Valid
            </Pill>
          ) : (
            <Pill tone="bad">{ERROR_LABEL[m.error!]}</Pill>
          )
        ) : null}
      </View>
      {m && !m.valid ? <Text className="text-muted-foreground">raw {rawText(m)}</Text> : null}
      {band ? <BandScale band={band} value={value} full /> : null}
      {PHASE_CURRENTS.includes(def.id) ? (
        <LoadBar value={value} rated={ratedCurrent} phase={phaseOf(def.id)!} />
      ) : null}
      {note ? (
        <Text className="text-muted-foreground">
          {note.charAt(0).toUpperCase() + note.slice(1)}
        </Text>
      ) : null}
    </Card>
  );
}

const RANGES: { value: SeriesRange; label: string }[] = [
  { value: 'month', label: '1 lună' },
  { value: 'quarter', label: '3 luni' },
  { value: 'all', label: 'Tot' },
];

/**
 * The measurement over time: from the history the backend keeps when there is one, otherwise
 * from the readings since the app opened.
 */
function TrendCard({ def }: { def: MeasurementDef }) {
  const { readings } = useMeterContext();
  const [range, setRange] = React.useState<SeriesRange>('all');
  const backend = useBackendSeries(def, range, readings.updatedAt);
  const values = backend ? backend.points.map((p) => p.v) : (readings.history[def.id] ?? []);
  const times = backend?.points.map((p) => p.at);

  const { factor, unit } = seriesScale(def.unit, values);
  const data = values.map((v) => v * factor);
  const decimals = factor === 1 ? def.decimals : 2;
  const band = bandFor(def.id);
  // Large counters (26 360,00 kWh) need a smaller size to stay on one line in a third of the card.
  const long = data.some((v) => num(v, decimals).length > 8);
  const stats =
    data.length > 0
      ? [
          { label: 'Minim', v: Math.min(...data) },
          { label: 'Medie', v: data.reduce((a, b) => a + b, 0) / data.length },
          { label: 'Maxim', v: Math.max(...data) },
        ]
      : [];

  // Dates under the chart; hours when every reading is from the same day.
  const sameDay = !!times && shortDate(times[0]) === shortDate(times[times.length - 1]);
  const when = (ms: number) => (sameDay ? clock(ms).slice(0, 5) : shortDate(ms));

  const empty = backend
    ? backend.loading
      ? 'Se încarcă istoricul…'
      : backend.error
        ? `Istoricul nu a putut fi citit: ${backend.error}`
        : 'Prea puține citiri în acest interval'
    : 'Graficul apare după câteva citiri';

  return (
    <Card className="gap-4 p-6">
      <View className="flex-row items-baseline justify-between gap-3">
        <Text className="font-display text-xl">Evoluție</Text>
        {backend ? (
          data.length > 0 ? (
            <Text className="text-muted-foreground">
              {data.length === 1 ? 'o citire' : `${data.length} ${de(data.length)}citiri`}
            </Text>
          ) : null
        ) : data.length > 1 ? (
          <Text className="text-muted-foreground">ultimele {span(data.length, POLL_MS)}</Text>
        ) : null}
      </View>
      {backend ? <Segmented value={range} onChange={setRange} options={RANGES} size="sm" /> : null}
      {data.length > 1 ? (
        <View className="gap-2">
          <TrendChart
            data={data}
            times={times}
            height={160}
            axis
            nominal={band?.nominal}
            decimals={band?.decimals ?? decimals}
          />
          {times ? (
            <View className="flex-row justify-between">
              <Text className="text-xs text-muted-foreground">{when(times[0])}</Text>
              <Text className="text-xs text-muted-foreground">{when(times[times.length - 1])}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <NoTrend height={120} text={empty} />
      )}
      {backend && backend.dropped > 0 ? (
        <Text className="text-sm text-muted-foreground">
          {backend.dropped === 1
            ? 'O valoare invalidă nu apare în grafic.'
            : `${backend.dropped} ${de(backend.dropped)}valori invalide nu apar în grafic.`}
        </Text>
      ) : null}
      {stats.length ? (
        <View className="flex-row gap-4 border-t border-border pt-4">
          {stats.map((s) => (
            <View key={s.label} className="flex-1 gap-0.5">
              <Text className="text-sm text-muted-foreground">{s.label}</Text>
              <Text className={cn('font-display-bold', long ? 'text-base' : 'text-lg')}>
                {num(s.v, decimals)}
                <Text className="text-sm text-muted-foreground"> {unit}</Text>
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const CHECKS: { error: ValidationError; title: string; applies: (d: MeasurementDef) => boolean }[] =
  [
    { error: 'not_finite', title: 'Valoare finită', applies: () => true },
    { error: 'wrong_unit', title: 'Unitate corectă', applies: () => true },
    { error: 'out_of_range', title: 'În domeniul plauzibil', applies: () => true },
    { error: 'counter_decreased', title: 'Contorul nu scade', applies: (d) => !!d.monotonic },
    { error: 'implausible_jump', title: 'Creștere plauzibilă', applies: (d) => !!d.monotonic },
    {
      error: 'cross_check_failed',
      title: 'Consistentă cu celelalte mărimi',
      applies: (d) => CROSS_CHECKED.includes(d.id),
    },
  ];

/** The checks run in order and stop at the first failure; the ones after it didn't run. */
function Checks({ def, m }: { def: MeasurementDef; m: Measurement }) {
  const checks = CHECKS.filter((c) => c.applies(def));
  const failed = m.valid ? -1 : checks.findIndex((c) => c.error === m.error);

  return (
    <View className="gap-3">
      <SectionHeading title="Validare" />
      <Card className="gap-0 overflow-hidden p-0">
        {checks.map((c, i) => {
          const state = failed === -1 || i < failed ? 'pass' : i === failed ? 'fail' : 'skip';
          return (
            <View
              key={c.error}
              className={cn(
                'min-h-[64px] flex-row items-center gap-4 px-5 py-3',
                i > 0 && 'border-t border-border'
              )}>
              <View
                className={cn(
                  'size-9 items-center justify-center rounded-full',
                  state === 'pass'
                    ? 'bg-ok-soft'
                    : state === 'fail'
                      ? 'bg-destructive-soft'
                      : 'bg-muted'
                )}>
                <Icon
                  as={state === 'pass' ? CheckIcon : state === 'fail' ? XIcon : MinusIcon}
                  className={cn(
                    'size-4',
                    state === 'pass'
                      ? 'text-ok'
                      : state === 'fail'
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                  )}
                />
              </View>
              <Text className={cn('flex-1 text-lg', state === 'skip' && 'text-muted-foreground')}>
                {c.title}
              </Text>
              {state === 'skip' ? (
                <Text className="text-sm text-muted-foreground">neverificat</Text>
              ) : null}
            </View>
          );
        })}
      </Card>
    </View>
  );
}
