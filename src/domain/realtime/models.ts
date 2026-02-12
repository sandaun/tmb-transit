export interface Arrival {
  lineCode: string;
  stationCode: string;
  directionId: string;
  platformCode?: string;
  destination: string;
  etaSec: number;
  sourceTimestampMs: number;
  serviceId?: string;
}

export interface VehicleEstimate {
  id: string;
  directionId: string;
  etaSec: number;
  segmentIndex: number;
  progress01: number;
  lat: number;
  lon: number;
  isEstimated: true;
}
