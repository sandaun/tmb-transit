import { env } from '../config/env';
import type { PlannedLegDto, PlannedRouteDto } from '../types/api';
import { asNumber, asString } from './helpers';

interface PlanRoutesInput {
  from: { lat: number; lon: number };
  to: { lat: number; lon: number };
  now?: Date;
}

interface RawPlannerPoint {
  name?: unknown;
  lat?: unknown;
  lon?: unknown;
}

interface RawPlannerLeg {
  mode?: unknown;
  route?: unknown;
  routeShortName?: unknown;
  routeLongName?: unknown;
  agencyName?: unknown;
  from?: RawPlannerPoint;
  to?: RawPlannerPoint;
  startTime?: unknown;
  endTime?: unknown;
  duration?: unknown;
  distance?: unknown;
  legGeometry?: {
    points?: unknown;
  };
}

interface RawPlannerItinerary {
  duration?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  walkDistance?: unknown;
  transfers?: unknown;
  legs?: RawPlannerLeg[];
}

interface RawPlannerResponse {
  plan?: {
    itineraries?: RawPlannerItinerary[];
  } | null;
  error?: {
    noPath?: unknown;
  };
}

export function formatPlannerDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}-${date.getFullYear()}`;
}

export function formatPlannerTime(date: Date): string {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'pm' : 'am';
  hours %= 12;
  if (hours === 0) {
    hours = 12;
  }
  return `${String(hours).padStart(2, '0')}:${minutes}${suffix}`;
}

function buildPlannerUrl(input: PlanRoutesInput): string {
  const now = input.now ?? new Date();
  const url = new URL(`${env.plannerBaseUrl}/plan`);
  url.searchParams.set('app_id', env.tmbAppId);
  url.searchParams.set('app_key', env.tmbAppKey);
  url.searchParams.set('fromPlace', `${input.from.lat},${input.from.lon}`);
  url.searchParams.set('toPlace', `${input.to.lat},${input.to.lon}`);
  url.searchParams.set('date', formatPlannerDate(now));
  url.searchParams.set('time', formatPlannerTime(now));
  url.searchParams.set('arriveBy', 'false');
  url.searchParams.set('mode', 'TRANSIT,WALK');
  url.searchParams.set('showIntermediateStops', 'false');
  return url.toString();
}

function decodePolyline(encoded: string): Array<{ lat: number; lon: number }> {
  const points: Array<{ lat: number; lon: number }> = [];
  let index = 0;
  let lat = 0;
  let lon = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);

    lat += (result & 1) === 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);

    lon += (result & 1) === 1 ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 100_000, lon: lon / 100_000 });
  }

  return points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
}

function mapPoint(raw: RawPlannerPoint | undefined, fallbackName: string) {
  const lat = asNumber(raw?.lat);
  const lon = asNumber(raw?.lon);
  return {
    name: asString(raw?.name) ?? fallbackName,
    ...(lat !== undefined ? { lat } : {}),
    ...(lon !== undefined ? { lon } : {}),
  };
}

function mapLeg(raw: RawPlannerLeg, index: number): PlannedLegDto {
  const modeRaw = asString(raw.mode)?.toUpperCase();
  const mode = modeRaw === 'WALK' ? 'walk' : 'transit';
  const route = asString(raw.routeShortName) ?? asString(raw.route);
  const encodedGeometry = asString(raw.legGeometry?.points);

  return {
    id: `leg-${index}`,
    mode,
    ...(route ? { route } : {}),
    ...(asString(raw.routeLongName) ? { routeLongName: asString(raw.routeLongName) } : {}),
    ...(asString(raw.agencyName) ? { agencyName: asString(raw.agencyName) } : {}),
    from: mapPoint(raw.from, 'Origin'),
    to: mapPoint(raw.to, 'Destination'),
    ...(asNumber(raw.startTime) !== undefined ? { startTimeMs: asNumber(raw.startTime) } : {}),
    ...(asNumber(raw.endTime) !== undefined ? { endTimeMs: asNumber(raw.endTime) } : {}),
    durationSec: Math.max(0, Math.round(asNumber(raw.duration) ?? 0)),
    ...(asNumber(raw.distance) !== undefined ? { distanceMeters: asNumber(raw.distance) } : {}),
    points: encodedGeometry ? decodePolyline(encodedGeometry) : [],
  };
}

export function mapPlannerResponse(payload: RawPlannerResponse): PlannedRouteDto[] {
  if (payload.error?.noPath === true || !payload.plan?.itineraries?.length) {
    return [];
  }

  return payload.plan.itineraries.map((itinerary, index) => {
    const legs = (itinerary.legs ?? []).map(mapLeg);
    return {
      id: `route-${index}`,
      durationSec: Math.max(0, Math.round(asNumber(itinerary.duration) ?? 0)),
      ...(asNumber(itinerary.startTime) !== undefined
        ? { startTimeMs: asNumber(itinerary.startTime) }
        : {}),
      ...(asNumber(itinerary.endTime) !== undefined
        ? { endTimeMs: asNumber(itinerary.endTime) }
        : {}),
      walkDistanceMeters: Math.max(0, Math.round(asNumber(itinerary.walkDistance) ?? 0)),
      transfers: Math.max(0, Math.round(asNumber(itinerary.transfers) ?? 0)),
      legs,
    };
  });
}

export async function getPlannedRoutes(input: PlanRoutesInput): Promise<PlannedRouteDto[]> {
  const response = await fetch(buildPlannerUrl(input));
  if (!response.ok) {
    throw new Error(`Planner API failed with status ${response.status}`);
  }

  const payload = (await response.json()) as RawPlannerResponse;
  return mapPlannerResponse(payload);
}
