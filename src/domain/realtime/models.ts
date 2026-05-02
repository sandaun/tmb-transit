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
