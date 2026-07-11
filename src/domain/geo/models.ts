import type { TransitOperator, TransportMode } from '@/src/domain/catalog/models';

export interface LatLng {
  lat: number;
  lon: number;
}

export interface Segment {
  id: string;
  lineCode: string;
  mode: TransportMode;
  operator?: TransitOperator;
  points: LatLng[];
  fromStationCode?: string;
  toStationCode?: string;
}
