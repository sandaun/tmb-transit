import { APP_CONFIG } from '@/src/config/app-config';
import {
  mapArrivalDto,
  mapLineDto,
  mapPlannedRouteDto,
  mapSegmentDto,
  mapStationDto,
} from '@/src/data/tmb/mappers';
import type {
  ApiResponse,
  ArrivalDto,
  LineDto,
  PlannedRouteDto,
  SegmentDto,
  StationDto,
} from '@/src/data/tmb/types';
import type { Line, Station, TransportMode } from '@/src/domain/catalog/models';
import type { Segment } from '@/src/domain/geo/models';
import type { PlannedRoute } from '@/src/domain/planner/models';
import type { Arrival } from '@/src/domain/realtime/models';

class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function requestJson<T>(path: string): Promise<T> {
  const response = await fetch(`${APP_CONFIG.apiBaseUrl}${path}`);

  if (!response.ok) {
    throw new ApiError(`Request failed: ${response.status}`, response.status);
  }

  return (await response.json()) as T;
}

export async function fetchLines(mode: TransportMode): Promise<Line[]> {
  const response = await requestJson<ApiResponse<LineDto[]>>(
    `/v1/catalog/${encodeURIComponent(mode)}/lines`,
  );
  return response.data.map(mapLineDto);
}

export async function fetchLineStations(mode: TransportMode, lineCode: string): Promise<Station[]> {
  const response = await requestJson<ApiResponse<StationDto[]>>(
    `/v1/catalog/${encodeURIComponent(mode)}/lines/${encodeURIComponent(lineCode)}/stations`,
  );
  return response.data.map(mapStationDto);
}

export async function fetchLineSegments(mode: TransportMode, lineCode: string): Promise<Segment[]> {
  const response = await requestJson<ApiResponse<SegmentDto[]>>(
    `/v1/catalog/${encodeURIComponent(mode)}/lines/${encodeURIComponent(lineCode)}/segments`,
  );
  return response.data.map(mapSegmentDto);
}

export async function fetchStationArrivals(
  mode: TransportMode,
  lineCode: string,
  stationCode: string,
): Promise<Arrival[]> {
  const query = new URLSearchParams({ lineCode, stationCode });
  const response = await requestJson<ApiResponse<ArrivalDto[]>>(
    `/v1/realtime/${encodeURIComponent(mode)}/arrivals?${query.toString()}`,
  );

  return response.data.map(mapArrivalDto);
}

export async function fetchPlannedRoutes(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
): Promise<PlannedRoute[]> {
  const query = new URLSearchParams({
    fromLat: String(from.lat),
    fromLon: String(from.lon),
    toLat: String(to.lat),
    toLon: String(to.lon),
  });
  const response = await requestJson<ApiResponse<PlannedRouteDto[]>>(
    `/v1/planner/routes?${query.toString()}`,
  );

  return response.data.map(mapPlannedRouteDto);
}
