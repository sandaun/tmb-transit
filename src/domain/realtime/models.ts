import type { TransportMode } from '@/src/domain/catalog/models';

export interface Arrival {
  lineCode: string;
  stationCode: string;
  mode: TransportMode;
  directionId: string;
  platformCode?: string;
  destination: string;
  etaSec: number;
  sourceTimestampMs: number;
  serviceId?: string;
}
