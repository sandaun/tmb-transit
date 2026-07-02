import { getBusLines, getBusLineStations } from './bus-client';
import { getMetroLines, getMetroLineStations } from './transit-client';
import type { StationDto, TransportMode } from '../types/api';

interface CacheEntry<T> {
  fetchedAt: number;
  data: T;
}

const TTL_MS = 24 * 60 * 60 * 1000;
// Bus has ~100 lines; fanning out unbounded risks rate-limiting from TMB and
// makes the first request very slow. Cap how many line requests run at once.
const STATION_FETCH_CONCURRENCY = 6;

let busStopsCache: CacheEntry<StationDto[]> | null = null;
let metroStopsCache: CacheEntry<StationDto[]> | null = null;
let busStopsInFlight: Promise<StationDto[]> | null = null;
let metroStopsInFlight: Promise<StationDto[]> | null = null;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;

  async function runNext(): Promise<void> {
    const index = cursor;
    cursor += 1;
    if (index >= items.length) {
      return;
    }

    try {
      results[index] = { status: 'fulfilled', value: await worker(items[index]) };
    } catch (reason) {
      results[index] = { status: 'rejected', reason };
    }

    await runNext();
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, runNext);
  await Promise.all(runners);
  return results;
}

async function collectStops(
  lines: { code: string; color?: string }[],
  fetchStations: (lineCode: string) => Promise<StationDto[]>,
): Promise<StationDto[]> {
  const stops: StationDto[] = [];
  const seen = new Set<string>();

  // One failing line must not drop every stop, so failures are settled and skipped.
  const settled = await mapWithConcurrency(lines, STATION_FETCH_CONCURRENCY, async (line) => ({
    line,
    stations: await fetchStations(line.code),
  }));

  for (const result of settled) {
    if (result.status !== 'fulfilled') {
      continue;
    }

    for (const station of result.value.stations) {
      if (seen.has(station.code)) {
        continue;
      }
      seen.add(station.code);
      stops.push({ ...station, lineColor: result.value.line.color });
    }
  }

  return stops;
}

async function fetchAllBusStops(): Promise<StationDto[]> {
  const lines = await getBusLines();
  return collectStops(lines, getBusLineStations);
}

async function fetchAllMetroStops(): Promise<StationDto[]> {
  const lines = await getMetroLines();
  return collectStops(lines, getMetroLineStations);
}

async function loadCached(
  mode: TransportMode,
): Promise<StationDto[]> {
  const now = Date.now();

  if (mode === 'bus') {
    if (busStopsCache && now - busStopsCache.fetchedAt < TTL_MS) {
      return busStopsCache.data;
    }
    if (!busStopsInFlight) {
      busStopsInFlight = fetchAllBusStops()
        .then((data) => {
          busStopsCache = { fetchedAt: Date.now(), data };
          return data;
        })
        .finally(() => {
          busStopsInFlight = null;
        });
    }
    return busStopsInFlight;
  }

  if (metroStopsCache && now - metroStopsCache.fetchedAt < TTL_MS) {
    return metroStopsCache.data;
  }
  if (!metroStopsInFlight) {
    metroStopsInFlight = fetchAllMetroStops()
      .then((data) => {
        metroStopsCache = { fetchedAt: Date.now(), data };
        return data;
      })
      .finally(() => {
        metroStopsInFlight = null;
      });
  }
  return metroStopsInFlight;
}

export interface NearbyStopDto extends StationDto {
  distanceMeters: number;
}

function haversineDistanceMeters(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const x = sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

export async function getNearbyStops(
  center: { lat: number; lon: number },
  radiusMeters: number,
  modes: TransportMode[],
  limit: number,
): Promise<NearbyStopDto[]> {
  const stops = await Promise.all(modes.map((mode) => loadCached(mode)));
  const flat = stops.flat();

  const result: NearbyStopDto[] = [];
  for (const stop of flat) {
    const distance = haversineDistanceMeters(center, stop);
    if (distance <= radiusMeters) {
      result.push({ ...stop, distanceMeters: distance });
    }
  }

  result.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return result.slice(0, limit);
}
