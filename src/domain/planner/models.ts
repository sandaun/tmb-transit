import type { LatLng } from '@/src/domain/geo/models';

export interface PlannerPoint extends Partial<LatLng> {
  name: string;
}

export type PlannedLegMode = 'walk' | 'transit';

export interface PlannedLeg {
  id: string;
  mode: PlannedLegMode;
  route?: string;
  routeLongName?: string;
  agencyName?: string;
  from: PlannerPoint;
  to: PlannerPoint;
  startTimeMs?: number;
  endTimeMs?: number;
  durationSec: number;
  distanceMeters?: number;
  points: LatLng[];
}

export interface PlannedRoute {
  id: string;
  durationSec: number;
  startTimeMs?: number;
  endTimeMs?: number;
  walkDistanceMeters: number;
  transfers: number;
  legs: PlannedLeg[];
}
