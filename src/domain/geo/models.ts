export interface LatLng {
  lat: number;
  lon: number;
}

export interface Segment {
  id: string;
  lineCode: string;
  points: LatLng[];
  fromStationCode?: string;
  toStationCode?: string;
}
