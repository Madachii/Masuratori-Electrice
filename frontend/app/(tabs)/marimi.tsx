import { MeasurementList, type Filter } from '@/components/meter/measurement-list';
import { Screen, ScreenTitle } from '@/components/screen';
import { useMeterContext } from '@/hooks/meter-context';
import { clock } from '@/lib/format';
import { router, useLocalSearchParams } from 'expo-router';
import { useWindowDimensions } from 'react-native';

export default function Measurements() {
  const { meter, readings, available } = useMeterContext();
  const { filtru } = useLocalSearchParams<{ filtru?: string }>();
  const filter: Filter = filtru === 'erori' ? 'errors' : 'all';
  const { width } = useWindowDimensions();

  return (
    <Screen>
      <ScreenTitle
        title="Mărimi"
        subtitle={
          readings.updatedAt !== null
            ? `${meter.name} · citit la ${clock(readings.updatedAt)}`
            : meter.name
        }
      />
      <MeasurementList
        snapshot={readings.snapshot}
        available={available}
        wide={width >= 900}
        filter={filter}
        onFilter={(f) => router.setParams({ filtru: f === 'errors' ? 'erori' : 'toate' })}
      />
    </Screen>
  );
}
