import type { TransitOperator, TransportMode } from '@/src/domain/catalog/models';

export interface Arrival {
  lineCode: string;
  stationCode: string;
  mode: TransportMode;
  operator?: TransitOperator;
  directionId: string;
  platformCode?: string;
  destination: string;
  etaSec: number;
  sourceTimestampMs: number;
  serviceId?: string;
  realtimeStatus?: 'realtime' | 'scheduled';
  delaySec?: number;
  isCancelled?: boolean;
}

export interface TransitVehicle {
  id: string;
  lineCode: string;
  mode: TransportMode;
  operator: TransitOperator;
  lat: number;
  lon: number;
  destination?: string;
  nextStops: string[];
  isOnTime?: boolean;
  occupancyPercent?: number;
}
