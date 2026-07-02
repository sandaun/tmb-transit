import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';

import { env } from './config/env';
import { catalogRoutes } from './routes/catalog';
import { healthRoutes } from './routes/health';
import { nearbyRoutes } from './routes/nearby';
import { plannerRoutes } from './routes/planner';
import { realtimeRoutes } from './routes/realtime';
import { serviceAlertsRoutes } from './routes/service-alerts';

export function createApp() {
  const app = Fastify({
    logger: true,
  });

  app.register(cors, { origin: true });

  // The proxy is unauthenticated, so cap per-IP request volume to protect the
  // shared TMB quota from abuse or a runaway client. Registered before the
  // routes so the limit applies to all of them.
  app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
  });

  app.register(healthRoutes);
  app.register(catalogRoutes);
  app.register(realtimeRoutes);
  app.register(nearbyRoutes);
  app.register(plannerRoutes);
  app.register(serviceAlertsRoutes);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      void reply.status(400).send({
        error: 'Bad Request',
      });
      return;
    }

    app.log.error(error);
    void reply.status(500).send({
      error: 'Internal Server Error',
    });
  });

  return app;
}

const start = async () => {
  const app = createApp();

  try {
    await app.ready();
    await app.listen({
      host: '0.0.0.0',
      port: env.port,
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

if (require.main === module) {
  void start();
}
