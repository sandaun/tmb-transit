import { APP_CONFIG } from '@/src/config/app-config';
import {
  fetchLineSegments as fetchLineSegmentsFromApi,
  fetchLineStations as fetchLineStationsFromApi,
  fetchLines as fetchLinesFromApi,
  fetchNearbyStops as fetchNearbyStopsFromApi,
  fetchPlannedRoutes as fetchPlannedRoutesFromApi,
  fetchServiceAlerts as fetchServiceAlertsFromApi,
  fetchStationArrivals as fetchStationArrivalsFromApi,
} from '@/src/data/tmb/client';
import {
  fetchLineSegmentsFromMock,
  fetchLineStationsFromMock,
  fetchLinesFromMock,
  fetchNearbyStopsFromMock,
  fetchPlannedRoutesFromMock,
  fetchServiceAlertsFromMock,
  fetchStationArrivalsFromMock,
} from '@/src/data/tmb/mock-client';
import type { ServiceAlert } from '@/src/domain/alerts/models';
import type { Line, Station, TransportMode } from '@/src/domain/catalog/models';
import type { LatLng, Segment } from '@/src/domain/geo/models';
import type { NearbyStop } from '@/src/domain/nearby/models';
import type { PlannedRoute } from '@/src/domain/planner/models';
import type { Arrival } from '@/src/domain/realtime/models';

interface TmbDataSource {
  fetchLines: (mode: TransportMode) => Promise<Line[]>;
  fetchLineStations: (mode: TransportMode, lineCode: string) => Promise<Station[]>;
  fetchLineSegments: (mode: TransportMode, lineCode: string) => Promise<Segment[]>;
  fetchStationArrivals: (
    mode: TransportMode,
    lineCode: string,
    stationCode: string,
  ) => Promise<Arrival[]>;
  fetchPlannedRoutes: (
    from: { lat: number; lon: number },
    to: { lat: number; lon: number },
  ) => Promise<PlannedRoute[]>;
  fetchServiceAlerts: (language?: 'ca' | 'es' | 'en') => Promise<ServiceAlert[]>;
  fetchNearbyStops: (
    center: LatLng,
    modes: TransportMode[],
    radiusMeters: number,
  ) => Promise<NearbyStop[]>;
}

const apiDataSource: TmbDataSource = {
  fetchLines: fetchLinesFromApi,
  fetchLineStations: fetchLineStationsFromApi,
  fetchLineSegments: fetchLineSegmentsFromApi,
  fetchStationArrivals: fetchStationArrivalsFromApi,
  fetchPlannedRoutes: fetchPlannedRoutesFromApi,
  fetchServiceAlerts: fetchServiceAlertsFromApi,
  fetchNearbyStops: fetchNearbyStopsFromApi,
};

const mockDataSource: TmbDataSource = {
  fetchLines: fetchLinesFromMock,
  fetchLineStations: fetchLineStationsFromMock,
  fetchLineSegments: fetchLineSegmentsFromMock,
  fetchStationArrivals: fetchStationArrivalsFromMock,
  fetchPlannedRoutes: fetchPlannedRoutesFromMock,
  fetchServiceAlerts: fetchServiceAlertsFromMock,
  fetchNearbyStops: fetchNearbyStopsFromMock,
};

export const DATA_SOURCE_MODE = APP_CONFIG.useMock ? 'mock' : 'api';

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  console.log(`[TMB] Data source mode: ${DATA_SOURCE_MODE}`);
}

export function getTmbDataSource(): TmbDataSource {
  return DATA_SOURCE_MODE === 'mock' ? mockDataSource : apiDataSource;
}

export async function fetchLines(mode: TransportMode) {
  return getTmbDataSource().fetchLines(mode);
}

export async function fetchLineStations(mode: TransportMode, lineCode: string) {
  return getTmbDataSource().fetchLineStations(mode, lineCode);
}

export async function fetchLineSegments(mode: TransportMode, lineCode: string) {
  return getTmbDataSource().fetchLineSegments(mode, lineCode);
}

export async function fetchStationArrivals(
  mode: TransportMode,
  lineCode: string,
  stationCode: string,
) {
  return getTmbDataSource().fetchStationArrivals(mode, lineCode, stationCode);
}

export async function fetchPlannedRoutes(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
) {
  return getTmbDataSource().fetchPlannedRoutes(from, to);
}

export async function fetchServiceAlerts(language: 'ca' | 'es' | 'en' = 'ca') {
  return getTmbDataSource().fetchServiceAlerts(language);
}

export async function fetchNearbyStops(
  center: LatLng,
  modes: TransportMode[],
  radiusMeters: number,
) {
  return getTmbDataSource().fetchNearbyStops(center, modes, radiusMeters);
}
