import type { LatLng } from '@/src/domain/geo/models';

export type TransitOperator = 'tmb' | 'fgc';
export type TransportMode = 'metro' | 'bus' | 'fgc';
export type VehicleMode = 'metro' | 'bus' | 'rail' | 'funicular';

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
