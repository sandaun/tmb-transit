import type { TransportMode } from '@/src/domain/catalog/models';

export interface LatLng {
  lat: number;
  lon: number;
}

export interface Segment {
  id: string;
  lineCode: string;
  mode: TransportMode;
  points: LatLng[];
  fromStationCode?: string;
  toStationCode?: string;
}
