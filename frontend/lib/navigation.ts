import type { MeasurementId } from '@/lib/measurements';
import { router } from 'expo-router';

/** Opens the detail screen of one measurement. */
export const openMeasurement = (id: MeasurementId) =>
  router.push({ pathname: '/marime/[id]', params: { id } });
