import type { MeasurementId } from '@/lib/measurements';

/** One value as the backend sends it. */
export type RawValue = { raw: number; unit: string };

export type RawFrame = Partial<Record<MeasurementId, RawValue>>;

/** One read cycle: the values and when the meter was read (ms since epoch). */
export type SourceResult = { frame: RawFrame; readAt: number };

/** Where readings come from: the backend, or the simulator while developing. */
export type MeterSource = () => Promise<SourceResult>;
