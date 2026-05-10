export type TransportMode = 'metro' | 'bus';

export interface ApiEnvelope<T> {
  data: T;
  meta?: {
    stale?: boolean;
    source?: string;
    fetchedAt?: string;
  };
}

export interface LineDto {
  code: string;
  name: string;
  color?: string;
  mode: TransportMode;
}

export interface StationDto {
  code: string;
  lineCode: string;
  mode: TransportMode;
  name: string;
  lat: number;
  lon: number;
  order?: number;
  accessibilityTypeId?: number;
  accessibilityLabel?: string;
  statusTypeId?: number;
  statusLabel?: string;
  serviceDescription?: string;
  serviceOrigin?: string;
  serviceDestination?: string;
}

export interface SegmentDto {
  id: string;
  lineCode: string;
  mode: TransportMode;
  points: Array<{ lat: number; lon: number }>;
  fromStationCode?: string;
  toStationCode?: string;
}

export interface ArrivalDto {
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
