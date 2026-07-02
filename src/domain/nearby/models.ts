import type { Station } from '@/src/domain/catalog/models';

export interface NearbyStop extends Station {
  distanceMeters: number;
}
