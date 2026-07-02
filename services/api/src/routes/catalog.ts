import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';

import { TtlCache } from '../cache/ttl-cache';
import { getBusLineSegments, getBusLineStations, getBusLines } from '../tmb/bus-client';
import {
  getMetroLineSegments,
  getMetroLines,
  getMetroLineStations,
} from '../tmb/transit-client';
import type { LineDto, SegmentDto, StationDto } from '../types/api';

const modeSchema = z.enum(['metro', 'bus']);
const modeParams = z.object({ mode: modeSchema });
const modeAndLineParams = z.object({ mode: modeSchema, lineCode: z.string().min(1) });

// Catalog data (lines, stations, geometry) is effectively static day to day, so
// there is no reason to hit TMB on every client request. Cache it server-side
// with single-flight dedupe and a stale fallback when upstream is unavailable.
const CATALOG_TTL_MS = 24 * 60 * 60 * 1000;
const CATALOG_STALE_MAX_MS = 7 * 24 * 60 * 60 * 1000;

const cache = new TtlCache<unknown>();
const inFlight = new Map<string, Promise<unknown>>();

async function loadCached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const fresh = cache.getFresh(key);
  if (fresh !== null) {
    return fresh as T;
  }

  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }

  const promise = loader()
    .then((data) => {
      cache.set(key, data, CATALOG_TTL_MS);
      return data;
    })
    .finally(() => {
      inFlight.delete(key);
    });
  inFlight.set(key, promise);

  try {
    return await promise;
  } catch (error) {
    const stale = cache.getStale(key, CATALOG_STALE_MAX_MS);
    if (stale !== null) {
      return stale as T;
    }
    throw error;
  }
}

async function listLines(mode: 'metro' | 'bus'): Promise<LineDto[]> {
  return mode === 'bus' ? getBusLines() : getMetroLines();
}

async function listLineStations(mode: 'metro' | 'bus', lineCode: string): Promise<StationDto[]> {
  return mode === 'bus' ? getBusLineStations(lineCode) : getMetroLineStations(lineCode);
}

async function listLineSegments(mode: 'metro' | 'bus', lineCode: string): Promise<SegmentDto[]> {
  return mode === 'bus' ? getBusLineSegments(lineCode) : getMetroLineSegments(lineCode);
}

export const catalogRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/v1/catalog/:mode/lines', async (request) => {
    const { mode } = modeParams.parse(request.params);
    const lines = await loadCached(`lines:${mode}`, () => listLines(mode));
    return { data: lines, meta: { source: 'tmb-transit', mode } };
  });

  fastify.get('/v1/catalog/:mode/lines/:lineCode/stations', async (request) => {
    const { mode, lineCode } = modeAndLineParams.parse(request.params);
    const stations = await loadCached(`stations:${mode}:${lineCode}`, () =>
      listLineStations(mode, lineCode),
    );
    return { data: stations, meta: { source: 'tmb-transit', mode } };
  });

  fastify.get('/v1/catalog/:mode/lines/:lineCode/segments', async (request) => {
    const { mode, lineCode } = modeAndLineParams.parse(request.params);
    const segments = await loadCached(`segments:${mode}:${lineCode}`, () =>
      listLineSegments(mode, lineCode),
    );
    return { data: segments, meta: { source: 'tmb-transit', mode } };
  });
};
