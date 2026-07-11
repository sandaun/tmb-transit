import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';

import { getPlannedRoutes } from '../tmb/planner-client';
import { toSafeErrorDetails } from '../utils/safe-logging';

const querySchema = z.object({
  fromLat: z.coerce.number().min(-90).max(90),
  fromLon: z.coerce.number().min(-180).max(180),
  toLat: z.coerce.number().min(-90).max(90),
  toLon: z.coerce.number().min(-180).max(180),
});

export const plannerRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/v1/planner/routes', async (request, reply) => {
    const query = querySchema.parse(request.query);

    try {
      const routes = await getPlannedRoutes({
        from: { lat: query.fromLat, lon: query.fromLon },
        to: { lat: query.toLat, lon: query.toLon },
      });

      return {
        data: routes,
        meta: { source: 'tmb-planner' },
      };
    } catch (error) {
      fastify.log.error({ error: toSafeErrorDetails(error) }, 'Planner upstream failed');
      return reply.status(502).send({ error: 'Planner unavailable' });
    }
  });
};
