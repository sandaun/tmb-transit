import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';

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
    const lines = await listLines(mode);
    return { data: lines, meta: { source: 'tmb-transit', mode } };
  });

  fastify.get('/v1/catalog/:mode/lines/:lineCode/stations', async (request) => {
    const { mode, lineCode } = modeAndLineParams.parse(request.params);
    const stations = await listLineStations(mode, lineCode);
    return { data: stations, meta: { source: 'tmb-transit', mode } };
  });

  fastify.get('/v1/catalog/:mode/lines/:lineCode/segments', async (request) => {
    const { mode, lineCode } = modeAndLineParams.parse(request.params);
    const segments = await listLineSegments(mode, lineCode);
    return { data: segments, meta: { source: 'tmb-transit', mode } };
  });
};
