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

export interface SegmentPointDto {
  lat: number;
  lon: number;
}

export interface SegmentDto {
  id: string;
  lineCode: string;
  points: SegmentPointDto[];
  fromStationCode?: string;
  toStationCode?: string;
}

export interface ArrivalDto {
  lineCode: string;
  stationCode: string;
  directionId: string;
  platformCode?: string;
  destination: string;
  etaSec: number;
  sourceTimestampMs: number;
  serviceId?: string;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    stale?: boolean;
    source?: string;
    fetchedAt?: string;
  };
}
