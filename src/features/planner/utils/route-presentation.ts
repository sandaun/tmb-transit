import type { TransportMode } from '@/src/domain/catalog/models';
import type { PlannedLeg, PlannedRoute } from '@/src/domain/planner/models';
import { getLineBrand } from '@/src/features/catalog/utils/line-brand';

export type RouteLandmarkKind =
  | 'origin'
  | 'boarding'
  | 'transfer'
  | 'alighting'
  | 'destination';

export interface RouteLandmark {
  id: string;
  kind: RouteLandmarkKind;
  name: string;
  coordinate: { lat: number; lon: number };
  legId?: string;
  incomingRoute?: string;
  outgoingRoute?: string;
}

export interface PlannerRoutePolyline {
  id: string;
  points: { lat: number; lon: number }[];
  color: string;
}

function getPointCoordinate(point: PlannedLeg['from']): { lat: number; lon: number } | null {
  if (point.lat === undefined || point.lon === undefined) {
    return null;
  }
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) {
    return null;
  }
  return { lat: point.lat, lon: point.lon };
}

function normalizePointName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function coordinateDistanceMeters(
  first: { lat: number; lon: number },
  second: { lat: number; lon: number },
): number {
  const latitudeMeters = (first.lat - second.lat) * 111_320;
  const longitudeMeters =
    (first.lon - second.lon) * 111_320 * Math.cos((first.lat * Math.PI) / 180);
  return Math.hypot(latitudeMeters, longitudeMeters);
}

function coordinatesAreNear(
  first: { lat: number; lon: number },
  second: { lat: number; lon: number },
  thresholdMeters = 18,
): boolean {
  return coordinateDistanceMeters(first, second) <= thresholdMeters;
}

function appendLandmark(landmarks: RouteLandmark[], landmark: RouteLandmark): void {
  const duplicate = landmarks.some((existing) => {
    const sameName = normalizePointName(existing.name) === normalizePointName(landmark.name);
    const samePlace = coordinatesAreNear(existing.coordinate, landmark.coordinate);
    return existing.kind === landmark.kind && (sameName || samePlace);
  });

  if (!duplicate) {
    landmarks.push(landmark);
  }
}

export function getPlannerRouteMode(route: string | undefined): TransportMode {
  return /^L\d|^FM$/i.test(route?.trim() ?? '') ? 'metro' : 'bus';
}

export function isInternalTransferWalk(
  leg: PlannedLeg,
  previousLeg: PlannedLeg | undefined,
  nextLeg: PlannedLeg | undefined,
): boolean {
  if (leg.mode !== 'walk' || previousLeg?.mode !== 'transit' || nextLeg?.mode !== 'transit') {
    return false;
  }

  const fromName = normalizePointName(leg.from.name);
  const toName = normalizePointName(leg.to.name);
  if (fromName && toName && fromName === toName) {
    return true;
  }

  return (leg.distanceMeters ?? Number.POSITIVE_INFINITY) <= 80;
}

export function getLegPoints(leg: PlannedLeg): { lat: number; lon: number }[] {
  if (leg.points.length > 1) {
    return leg.points.filter(
      (point) => Number.isFinite(point.lat) && Number.isFinite(point.lon),
    );
  }

  const from = getPointCoordinate(leg.from);
  const to = getPointCoordinate(leg.to);
  return from && to ? [from, to] : [];
}

export function buildRoutePolylines(
  route: PlannedRoute | null,
  walkColor: string,
): PlannerRoutePolyline[] {
  if (!route) {
    return [];
  }

  return route.legs
    .map((leg, index) => {
      if (isInternalTransferWalk(leg, route.legs[index - 1], route.legs[index + 1])) {
        return null;
      }

      const points = getLegPoints(leg);
      if (points.length < 2) {
        return null;
      }

      return {
        id: leg.id,
        points,
        color:
          leg.mode === 'walk'
            ? walkColor
            : getLineBrand(getPlannerRouteMode(leg.route), leg.route ?? '').backgroundColor,
      };
    })
    .filter((polyline): polyline is PlannerRoutePolyline => polyline !== null);
}

export function buildRouteLandmarks(route: PlannedRoute | null): RouteLandmark[] {
  if (!route || route.legs.length === 0) {
    return [];
  }

  const landmarks: RouteLandmark[] = [];
  const firstLeg = route.legs[0];
  const lastLeg = route.legs[route.legs.length - 1];
  const originCoordinate = getPointCoordinate(firstLeg.from);
  const destinationCoordinate = getPointCoordinate(lastLeg.to);

  if (originCoordinate) {
    appendLandmark(landmarks, {
      id: 'origin',
      kind: 'origin',
      name: firstLeg.from.name,
      coordinate: originCoordinate,
      legId: firstLeg.id,
    });
  }

  const transitIndexes = route.legs
    .map((leg, index) => (leg.mode === 'transit' ? index : -1))
    .filter((index) => index >= 0);

  const firstTransitIndex = transitIndexes[0];
  const lastTransitIndex = transitIndexes[transitIndexes.length - 1];
  if (firstTransitIndex !== undefined) {
    const firstTransit = route.legs[firstTransitIndex];
    const coordinate = getPointCoordinate(firstTransit.from);
    if (coordinate) {
      appendLandmark(landmarks, {
        id: `boarding:${firstTransit.id}`,
        kind: 'boarding',
        name: firstTransit.from.name,
        coordinate,
        legId: firstTransit.id,
        outgoingRoute: firstTransit.route,
      });
    }
  }

  for (let index = 0; index < transitIndexes.length - 1; index += 1) {
    const incomingIndex = transitIndexes[index];
    const outgoingIndex = transitIndexes[index + 1];
    const incomingLeg = route.legs[incomingIndex];
    const outgoingLeg = route.legs[outgoingIndex];
    const transferLeg = route.legs.slice(incomingIndex + 1, outgoingIndex).find(
      (leg) => leg.mode === 'walk',
    );
    const coordinate =
      getPointCoordinate(outgoingLeg.from) ?? getPointCoordinate(incomingLeg.to);

    if (coordinate) {
      appendLandmark(landmarks, {
        id: `transfer:${incomingLeg.id}:${outgoingLeg.id}`,
        kind: 'transfer',
        name: outgoingLeg.from.name || incomingLeg.to.name,
        coordinate,
        legId: transferLeg?.id ?? outgoingLeg.id,
        incomingRoute: incomingLeg.route,
        outgoingRoute: outgoingLeg.route,
      });
    }
  }

  if (lastTransitIndex !== undefined) {
    const lastTransit = route.legs[lastTransitIndex];
    const coordinate = getPointCoordinate(lastTransit.to);
    if (coordinate) {
      appendLandmark(landmarks, {
        id: `alighting:${lastTransit.id}`,
        kind: 'alighting',
        name: lastTransit.to.name,
        coordinate,
        legId: lastTransit.id,
        incomingRoute: lastTransit.route,
      });
    }
  }

  if (destinationCoordinate) {
    appendLandmark(landmarks, {
      id: 'destination',
      kind: 'destination',
      name: lastLeg.to.name,
      coordinate: destinationCoordinate,
      legId: lastLeg.id,
    });
  }

  return landmarks;
}
