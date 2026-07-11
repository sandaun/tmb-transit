import type {
  TransitOperator,
  LineServiceStatus,
  TransportMode,
  VehicleMode,
} from '@/src/domain/catalog/models';

export type ServiceAlertModeDto = TransportMode | 'mixed';
export type ServiceAlertSeverityDto = 'info' | 'warning' | 'disruption';
export type ServiceAlertKindDto = 'current' | 'planned';
export type ServiceAlertSourceDto = 'tmb-alerts-api' | 'tmb-service-notices' | 'fgc-gtfs-rt';

export interface LineDto {
  code: string;
  name: string;
  color?: string;
  mode: TransportMode;
  operator?: TransitOperator;
  vehicleMode?: VehicleMode;
  network?: string;
  textColor?: string;
  originStation?: string;
  destinationStation?: string;
  serviceStatus?: LineServiceStatus;
}

export interface StationDto {
  code: string;
  lineCode: string;
  lineColor?: string;
  mode: TransportMode;
  operator?: TransitOperator;
  vehicleMode?: VehicleMode;
  network?: string;
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
  operator?: TransitOperator;
  points: SegmentPointDto[];
  fromStationCode?: string;
  toStationCode?: string;
}

export interface ArrivalDto {
  lineCode: string;
  stationCode: string;
  mode: TransportMode;
  operator?: TransitOperator;
  directionId: string;
  platformCode?: string;
  destination: string;
  etaSec: number;
  sourceTimestampMs: number;
  serviceId?: string;
  realtimeStatus?: 'realtime' | 'scheduled';
  delaySec?: number;
  isCancelled?: boolean;
}

export interface TransitVehicleDto {
  id: string;
  lineCode: string;
  mode: TransportMode;
  operator: TransitOperator;
  lat: number;
  lon: number;
  destination?: string;
  nextStops: string[];
  isOnTime?: boolean;
  occupancyPercent?: number;
}

export interface ServiceAlertLineDto {
  mode: TransportMode;
  operator?: TransitOperator;
  code: string;
}

export interface ServiceAlertDto {
  id: string;
  title: string;
  description: string;
  mode: ServiceAlertModeDto;
  operator?: TransitOperator;
  severity: ServiceAlertSeverityDto;
  kind: ServiceAlertKindDto;
  affectedLines: ServiceAlertLineDto[];
  source: ServiceAlertSourceDto;
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
  operator?: TransitOperator;
  transportMode?: TransportMode;
  network?: string;
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
