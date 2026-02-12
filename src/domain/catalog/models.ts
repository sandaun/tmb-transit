import type { LatLng } from '@/src/domain/geo/models';

export interface Line {
  code: string;
  name: string;
  mode: 'metro';
  color?: string;
}

export interface Station extends LatLng {
  code: string;
  lineCode: string;
  name: string;
  order?: number;
}
