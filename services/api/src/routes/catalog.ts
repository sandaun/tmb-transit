import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';

import { getMetroLineSegments, getMetroLines, getMetroLineStations } from '../tmb/transit-client';

const paramsSchema = z.object({
  lineCode: z.string().min(1),
});

export const catalogRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/v1/catalog/metro/lines', async () => {
    const lines = await getMetroLines();
    return { data: lines, meta: { source: 'tmb-transit' } };
  });

  fastify.get('/v1/catalog/metro/lines/:lineCode/stations', async (request) => {
    const params = paramsSchema.parse(request.params);
    const stations = await getMetroLineStations(params.lineCode);
    return { data: stations, meta: { source: 'tmb-transit' } };
  });

  fastify.get('/v1/catalog/metro/lines/:lineCode/segments', async (request) => {
    const params = paramsSchema.parse(request.params);
    const segments = await getMetroLineSegments(params.lineCode);
    return { data: segments, meta: { source: 'tmb-transit' } };
  });
};
