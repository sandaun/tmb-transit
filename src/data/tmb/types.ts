import type { TransportMode } from '@/src/domain/catalog/models';

export type ServiceAlertModeDto = TransportMode | 'mixed';
export type ServiceAlertSeverityDto = 'info' | 'warning' | 'disruption';

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

export interface SegmentPointDto {
  lat: number;
  lon: number;
}

export interface SegmentDto {
  id: string;
  lineCode: string;
  mode: TransportMode;
  points: SegmentPointDto[];
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
  mode: ServiceAlertModeDto;
  severity: ServiceAlertSeverityDto;
  affectedLines: ServiceAlertLineDto[];
  source: 'tmb-service-notices';
  sourceUrl?: string;
  dateLabel?: string;
  startsAtMs?: number;
  endsAtMs?: number;
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
  points: SegmentPointDto[];
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

export interface ApiResponse<T> {
  data: T;
  meta?: {
    stale?: boolean;
    source?: string;
    fetchedAt?: string;
  };
}
