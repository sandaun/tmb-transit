import { APP_CONFIG } from '@/src/config/app-config';
import {
  fetchLineSegments as fetchLineSegmentsFromApi,
  fetchLineStations as fetchLineStationsFromApi,
  fetchMetroLines as fetchMetroLinesFromApi,
  fetchStationArrivals as fetchStationArrivalsFromApi,
} from '@/src/data/tmb/client';
import {
  fetchLineSegmentsFromMock,
  fetchLineStationsFromMock,
  fetchMetroLinesFromMock,
  fetchStationArrivalsFromMock,
} from '@/src/data/tmb/mock-client';
import type { Line, Station } from '@/src/domain/catalog/models';
import type { Segment } from '@/src/domain/geo/models';
import type { Arrival } from '@/src/domain/realtime/models';

interface TmbDataSource {
  fetchMetroLines: () => Promise<Line[]>;
  fetchLineStations: (lineCode: string) => Promise<Station[]>;
  fetchLineSegments: (lineCode: string) => Promise<Segment[]>;
  fetchStationArrivals: (lineCode: string, stationCode: string) => Promise<Arrival[]>;
}

const apiDataSource: TmbDataSource = {
  fetchMetroLines: fetchMetroLinesFromApi,
  fetchLineStations: fetchLineStationsFromApi,
  fetchLineSegments: fetchLineSegmentsFromApi,
  fetchStationArrivals: fetchStationArrivalsFromApi,
};

const mockDataSource: TmbDataSource = {
  fetchMetroLines: fetchMetroLinesFromMock,
  fetchLineStations: fetchLineStationsFromMock,
  fetchLineSegments: fetchLineSegmentsFromMock,
  fetchStationArrivals: fetchStationArrivalsFromMock,
};

export const DATA_SOURCE_MODE = APP_CONFIG.useMock ? 'mock' : 'api';

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  console.log(`[TMB] Data source mode: ${DATA_SOURCE_MODE}`);
}

export function getTmbDataSource(): TmbDataSource {
  return DATA_SOURCE_MODE === 'mock' ? mockDataSource : apiDataSource;
}

export async function fetchMetroLines() {
  return getTmbDataSource().fetchMetroLines();
}

export async function fetchLineStations(lineCode: string) {
  return getTmbDataSource().fetchLineStations(lineCode);
}

export async function fetchLineSegments(lineCode: string) {
  return getTmbDataSource().fetchLineSegments(lineCode);
}

export async function fetchStationArrivals(lineCode: string, stationCode: string) {
  return getTmbDataSource().fetchStationArrivals(lineCode, stationCode);
}
