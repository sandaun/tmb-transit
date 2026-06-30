import type { FastifyPluginAsync } from 'fastify';

import { TtlCache } from '../cache/ttl-cache';
import { runtimeConfig } from '../config/env';
import { fetchServiceAlertsFromTmb } from '../tmb/service-notices-client';
import type { ServiceAlertDto } from '../types/api';

const CACHE_KEY = 'service-alerts';

const cache = new TtlCache<ServiceAlertDto[]>();
let inFlight: Promise<ServiceAlertDto[]> | null = null;

export const serviceAlertsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/v1/service-alerts', async (_request, reply) => {
    const fresh = cache.getFresh(CACHE_KEY);
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

    if (inFlight) {
      const shared = await inFlight;
      return {
        data: shared,
        meta: {
          source: 'single-flight',
          stale: false,
          fetchedAt: new Date().toISOString(),
        },
      };
    }

    inFlight = fetchServiceAlertsFromTmb()
      .then((alerts) => {
        cache.set(CACHE_KEY, alerts, runtimeConfig.serviceAlertsCacheTtlMs);
        return alerts;
      })
      .finally(() => {
        inFlight = null;
      });

    try {
      const alerts = await inFlight;
      return {
        data: alerts,
        meta: {
          source: 'tmb-service-notices',
          stale: false,
          fetchedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      const stale = cache.getStale(CACHE_KEY, runtimeConfig.serviceAlertsStaleMaxMs);
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
