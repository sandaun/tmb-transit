import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';

import { TtlCache } from '../cache/ttl-cache';
import { runtimeConfig } from '../config/env';
import { fetchArrivalsByStation } from '../tmb/imetro-client';
import type { ArrivalDto } from '../types/api';

const querySchema = z.object({
  lineCode: z.string().min(1),
  stationCode: z.string().min(1),
});

const cache = new TtlCache<ArrivalDto[]>();
const inFlight = new Map<string, Promise<ArrivalDto[]>>();

function cacheKey(lineCode: string, stationCode: string): string {
  return `arrivals:${lineCode}:${stationCode}`;
}

export const realtimeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/v1/realtime/metro/arrivals', async (request, reply) => {
    const query = querySchema.parse(request.query);
    const key = cacheKey(query.lineCode, query.stationCode);

    const fresh = cache.getFresh(key);
    if (fresh) {
      return {
        data: fresh,
        meta: {
          source: 'cache',
          stale: false,
          fetchedAt: new Date().toISOString(),
        },
      };
    }

    const currentFlight = inFlight.get(key);
    if (currentFlight) {
      const shared = await currentFlight;
      return {
        data: shared,
        meta: {
          source: 'single-flight',
          stale: false,
          fetchedAt: new Date().toISOString(),
        },
      };
    }

    const fetchPromise = fetchArrivalsByStation(query.stationCode, query.lineCode)
      .then((arrivals) => {
        cache.set(key, arrivals, runtimeConfig.realtimeCacheTtlMs);
        return arrivals;
      })
      .finally(() => {
        inFlight.delete(key);
      });

    inFlight.set(key, fetchPromise);

    try {
      const arrivals = await fetchPromise;
      return {
        data: arrivals,
        meta: {
          source: 'tmb-imetro',
          stale: false,
          fetchedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      const stale = cache.getStale(key, runtimeConfig.realtimeStaleMaxMs);
      if (stale) {
        return {
          data: stale,
          meta: {
            source: 'stale-cache',
            stale: true,
            fetchedAt: new Date().toISOString(),
          },
        };
      }

      fastify.log.error(error);
      return reply.status(502).send({
        error: 'Upstream unavailable',
      });
    }
  });
};
