import type { LatLng } from '@/src/domain/geo/models';

export type TransportMode = 'metro' | 'bus';

export interface Line {
  code: string;
  name: string;
  mode: TransportMode;
  color?: string;
  originStation?: string;
  destinationStation?: string;
}

export interface Station extends LatLng {
  code: string;
  lineCode: string;
  mode: TransportMode;
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
