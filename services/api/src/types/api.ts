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
  mode: 'metro';
}

export interface StationDto {
  code: string;
  lineCode: string;
  name: string;
  lat: number;
  lon: number;
  order?: number;
}

export interface SegmentDto {
  id: string;
  lineCode: string;
  points: Array<{ lat: number; lon: number }>;
  fromStationCode?: string;
  toStationCode?: string;
}

export interface ArrivalDto {
  lineCode: string;
  stationCode: string;
  directionId: string;
  destination: string;
  etaSec: number;
  sourceTimestampMs: number;
  serviceId?: string;
}
