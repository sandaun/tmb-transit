import { env } from '../config/env';
import type { PlannedLegDto, PlannedRouteDto } from '../types/api';
import { asNumber, asString } from './helpers';
import { fetchWithTimeout } from './http';

// TMB Planner interprets `date`/`time` as Barcelona wall-clock. Formatting the
// server's local time instead would request the wrong schedule whenever the API
// runs in another timezone (e.g. UTC in production).
const PLANNER_TIME_ZONE = 'Europe/Madrid';

interface WallClockParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function localParts(date: Date): WallClockParts {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

function zonedParts(date: Date, timeZone: string): WallClockParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    parts[part.type] = part.value;
  }

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // Intl can emit '24' for midnight depending on the runtime; normalize it.
    hour: parts.hour === '24' ? 0 : Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function formatDateParts(parts: WallClockParts): string {
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${month}-${day}-${parts.year}`;
}

function formatTimeParts(parts: WallClockParts): string {
  let hours = parts.hour;
  const minutes = String(parts.minute).padStart(2, '0');
  const suffix = hours >= 12 ? 'pm' : 'am';
  hours %= 12;
  if (hours === 0) {
    hours = 12;
  }
  return `${String(hours).padStart(2, '0')}:${minutes}${suffix}`;
}

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
  return formatDateParts(localParts(date));
}

export function formatPlannerTime(date: Date): string {
  return formatTimeParts(localParts(date));
}

function buildPlannerUrl(input: PlanRoutesInput): string {
  const now = input.now ?? new Date();
  const barcelonaParts = zonedParts(now, PLANNER_TIME_ZONE);
  const url = new URL(`${env.plannerBaseUrl}/plan`);
  url.searchParams.set('app_id', env.tmbAppId);
  url.searchParams.set('app_key', env.tmbAppKey);
  url.searchParams.set('fromPlace', `${input.from.lat},${input.from.lon}`);
  url.searchParams.set('toPlace', `${input.to.lat},${input.to.lon}`);
  url.searchParams.set('date', formatDateParts(barcelonaParts));
  url.searchParams.set('time', formatTimeParts(barcelonaParts));
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
  const agencyName = asString(raw.agencyName);
  const normalizedAgency = agencyName?.toLowerCase() ?? '';
  const isFgc = normalizedAgency.includes('fgc') || normalizedAgency.includes('ferrocarrils');
  const isTram = normalizedAgency.includes('trambaix') ||
    normalizedAgency.includes('trambesòs') ||
    normalizedAgency.includes('trambesos') ||
    normalizedAgency === 'tram';
  const transportMode = isTram
    ? 'tram'
    : isFgc
    ? 'fgc'
    : /^L\d|^FM$/i.test(route ?? '')
      ? 'metro'
      : 'bus';
  const network = isTram
    ? normalizedAgency.includes('baix') ? 'trambaix' : 'trambesos'
    : isFgc && route
      ? ['L6', 'L7', 'L12', 'S1', 'S2', 'FV'].includes(route.toUpperCase())
      ? 'barcelona-valles'
      : 'llobregat-anoia'
      : undefined;
  const encodedGeometry = asString(raw.legGeometry?.points);

  return {
    id: `leg-${index}`,
    mode,
    ...(route ? { route } : {}),
    ...(asString(raw.routeLongName) ? { routeLongName: asString(raw.routeLongName) } : {}),
    ...(agencyName ? { agencyName } : {}),
    ...(!isFgc && !isTram && mode === 'walk'
      ? {}
      : { operator: isTram ? 'tram' : isFgc ? 'fgc' : 'tmb', transportMode }),
    ...(network ? { network } : {}),
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
  const response = await fetchWithTimeout(buildPlannerUrl(input));
  if (!response.ok) {
    throw new Error(`Planner API failed with status ${response.status}`);
  }

  const payload = (await response.json()) as RawPlannerResponse;
  return mapPlannerResponse(payload);
}
