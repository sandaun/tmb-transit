import Fastify from 'fastify';
import cors from '@fastify/cors';

import { env } from './config/env';
import { catalogRoutes } from './routes/catalog';
import { healthRoutes } from './routes/health';
import { realtimeRoutes } from './routes/realtime';

const app = Fastify({
  logger: true,
});

const start = async () => {
  try {
    await app.register(cors, { origin: true });
    await app.register(healthRoutes);
    await app.register(catalogRoutes);
    await app.register(realtimeRoutes);

    app.setErrorHandler((error, _request, reply) => {
      app.log.error(error);
      void reply.status(500).send({
        error: 'Internal Server Error',
      });
    });

    await app.listen({
      host: '0.0.0.0',
      port: env.port,
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
