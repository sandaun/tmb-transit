export type TransportMode = 'metro' | 'bus';
export type ServiceAlertMode = TransportMode | 'mixed';
export type ServiceAlertSeverity = 'info' | 'warning' | 'disruption';
export type ServiceAlertKind = 'current' | 'planned';
export type ServiceAlertSource = 'tmb-alerts-api' | 'tmb-service-notices';

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
  originStation?: string;
  destinationStation?: string;
}

export interface StationDto {
  code: string;
  lineCode: string;
  lineColor?: string;
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

export interface ServiceAlertLineDto {
  mode: TransportMode;
  code: string;
}

export interface ServiceAlertDto {
  id: string;
  title: string;
  description: string;
  mode: ServiceAlertMode;
  severity: ServiceAlertSeverity;
  kind: ServiceAlertKind;
  affectedLines: ServiceAlertLineDto[];
  source: ServiceAlertSource;
  sourceUrl?: string;
  dateLabel?: string;
  startsAtMs?: number;
  endsAtMs?: number;
  updatedAtMs?: number;
}

export interface PlannerPointDto {
  name: string;
  lat?: number;
  lon?: number;
}

export type PlannedLegModeDto = 'walk' | 'transit';

export interface PlannedLegDto {
  id: string;
  mode: PlannedLegModeDto;
  route?: string;
  routeLongName?: string;
  agencyName?: string;
  from: PlannerPointDto;
  to: PlannerPointDto;
  startTimeMs?: number;
  endTimeMs?: number;
  durationSec: number;
  distanceMeters?: number;
  points: Array<{ lat: number; lon: number }>;
}

export interface PlannedRouteDto {
  id: string;
  durationSec: number;
  startTimeMs?: number;
  endTimeMs?: number;
  walkDistanceMeters: number;
  transfers: number;
  legs: PlannedLegDto[];
}
