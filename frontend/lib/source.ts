import type { MeasurementId } from '@/lib/measurements';

/** One value as the backend sends it. */
export type RawValue = { raw: number; unit: string };

export type RawFrame = Partial<Record<MeasurementId, RawValue>>;

/** One read cycle: the values and when the meter was read (ms since epoch). */
export type SourceResult = {
  frame: RawFrame;
  readAt: number;
  /**
   * The read cycle before this one, when the source keeps it (the backend does). The checks
   * over time compare with it, so they also work on the first reading after the app opens.
   */
  previous?: { frame: RawFrame; readAt: number };
};

/** Where readings come from: the backend. */
export type MeterSource = () => Promise<SourceResult>;
