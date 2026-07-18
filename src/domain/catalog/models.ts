import type { LatLng } from '@/src/domain/geo/models';

export type TransitOperator = 'tmb' | 'fgc' | 'tram';
export type TransportMode = 'metro' | 'bus' | 'fgc' | 'tram';
export type VehicleMode = 'metro' | 'bus' | 'rail' | 'funicular' | 'tram';
export type LineServiceStatus = 'active' | 'no-service' | 'unknown';

export interface Line {
  code: string;
  name: string;
  mode: TransportMode;
  operator?: TransitOperator;
  vehicleMode?: VehicleMode;
  network?: string;
  color?: string;
  textColor?: string;
  originStation?: string;
  destinationStation?: string;
  serviceStatus?: LineServiceStatus;
}

export interface Station extends LatLng {
  code: string;
  lineCode: string;
  lineColor?: string;
  mode: TransportMode;
  operator?: TransitOperator;
  vehicleMode?: VehicleMode;
  network?: string;
  name: string;
  order?: number;
  accessibilityTypeId?: number;
  accessibilityLabel?: string;
  statusTypeId?: number;
  statusLabel?: string;
  serviceDescription?: string;
  serviceOrigin?: string;
  serviceDestination?: string;
}
