import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { TtlCache } from '../cache/ttl-cache';
import { runtimeConfig } from '../config/env';
import { getFgcServiceAlerts } from '../fgc/client';
import { fetchOperationalServiceAlertsFromTmb } from '../tmb/alerts-client';
import { fetchServiceAlertsFromTmb } from '../tmb/service-notices-client';
import type { ServiceAlertDto } from '../types/api';
import { toSafeErrorDetails } from '../utils/safe-logging';

const cache = new TtlCache<ServiceAlertDto[]>();
const inFlight = new Map<string, Promise<ServiceAlertDto[]>>();

function sortAlerts(alerts: ServiceAlertDto[]): ServiceAlertDto[] {
  return [...alerts].sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === 'current' ? -1 : 1;
    }

    return (right.updatedAtMs ?? right.startsAtMs ?? 0) - (left.updatedAtMs ?? left.startsAtMs ?? 0);
  });
}

async function fetchCombinedServiceAlerts(language: 'ca' | 'es' | 'en'): Promise<ServiceAlertDto[]> {
  const [operationalResult, plannedResult, fgcResult] = await Promise.allSettled([
    fetchOperationalServiceAlertsFromTmb(),
    fetchServiceAlertsFromTmb(),
    getFgcServiceAlerts(language),
  ]);
  const alerts: ServiceAlertDto[] = [];

  if (operationalResult.status === 'fulfilled') {
    alerts.push(...operationalResult.value);
  }

  if (plannedResult.status === 'fulfilled') {
    alerts.push(...plannedResult.value);
  }

  if (fgcResult.status === 'fulfilled') {
    alerts.push(...fgcResult.value);
  }

  if (alerts.length === 0) {
    throw new Error('All service alert sources failed');
  }

  return sortAlerts(alerts);
}

export const serviceAlertsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/v1/service-alerts', async (request, reply) => {
    const { lang } = z.object({ lang: z.enum(['ca', 'es', 'en']).default('ca') }).parse(request.query);
    const cacheKey = `service-alerts:${lang}`;
    const fresh = cache.getFresh(cacheKey);
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

    const currentFlight = inFlight.get(cacheKey);
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

    const nextFlight = fetchCombinedServiceAlerts(lang)
      .then((alerts) => {
        cache.set(cacheKey, alerts, runtimeConfig.serviceAlertsCacheTtlMs);
        return alerts;
      })
      .finally(() => {
        inFlight.delete(cacheKey);
      });
    inFlight.set(cacheKey, nextFlight);

    try {
      const alerts = await nextFlight;
      return {
        data: alerts,
        meta: {
          source: 'combined-service-alerts',
          stale: false,
          fetchedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      const stale = cache.getStale(cacheKey, runtimeConfig.serviceAlertsStaleMaxMs);
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

      fastify.log.error({ error: toSafeErrorDetails(error) }, 'Service alerts upstream failed');
      return reply.status(502).send({
        error: 'Upstream unavailable',
      });
    }
  });
};
