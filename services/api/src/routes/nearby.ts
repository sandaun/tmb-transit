import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';

import { getAllFgcStations } from '../fgc/client';
import { getAllTramStations } from '../tram/client';
import { getNearbyStops } from '../tmb/nearby-stops';
import type { TransportMode } from '../types/api';
import { toSafeErrorDetails } from '../utils/safe-logging';

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().int().min(50).max(2000).default(500),
  modes: z.string().default('metro,bus,fgc,tram'),
  limit: z.coerce.number().int().min(1).max(200).default(80),
});

function parseModes(raw: string): TransportMode[] {
  const candidates = raw.split(',').map((value) => value.trim().toLowerCase());
  const result: TransportMode[] = [];
  for (const value of candidates) {
    if (value === 'metro' || value === 'bus' || value === 'fgc' || value === 'tram') {
      if (!result.includes(value)) {
        result.push(value);
      }
    }
  }
  if (result.length === 0) {
    return ['metro', 'bus', 'fgc', 'tram'];
  }
  return result;
}

export const nearbyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/v1/nearby/stops', async (request, reply) => {
    const query = querySchema.parse(request.query);
    const modes = parseModes(query.modes);

    try {
      const tmbModes = modes.filter(
        (mode): mode is 'metro' | 'bus' => mode === 'metro' || mode === 'bus',
      );
      const [tmbResult, fgcResult, tramResult] = await Promise.allSettled([
        tmbModes.length
          ? getNearbyStops({ lat: query.lat, lon: query.lon }, query.radius, tmbModes, query.limit)
          : Promise.resolve([]),
        modes.includes('fgc') ? getAllFgcStations() : Promise.resolve([]),
        modes.includes('tram') ? getAllTramStations() : Promise.resolve([]),
      ]);
      const requestedResults = [
        ...(tmbModes.length ? [tmbResult] : []),
        ...(modes.includes('fgc') ? [fgcResult] : []),
        ...(modes.includes('tram') ? [tramResult] : []),
      ];
      if (requestedResults.every((result) => result.status === 'rejected')) {
        throw requestedResults[0]?.status === 'rejected'
          ? requestedResults[0].reason
          : new Error('All nearby stop sources failed');
      }
      const tmbStops = tmbResult.status === 'fulfilled' ? tmbResult.value : [];
      const fgcStations = fgcResult.status === 'fulfilled' ? fgcResult.value : [];
      const tramStations = tramResult.status === 'fulfilled' ? tramResult.value : [];
      const fgcStops = fgcStations.flatMap((station) => {
        const latMeters = (station.lat - query.lat) * 111_320;
        const lonMeters =
          (station.lon - query.lon) * 111_320 * Math.cos((query.lat * Math.PI) / 180);
        const distanceMeters = Math.hypot(latMeters, lonMeters);
        return distanceMeters <= query.radius ? [{ ...station, distanceMeters }] : [];
      });
      const tramStops = tramStations.flatMap((station) => {
        const latMeters = (station.lat - query.lat) * 111_320;
        const lonMeters =
          (station.lon - query.lon) * 111_320 * Math.cos((query.lat * Math.PI) / 180);
        const distanceMeters = Math.hypot(latMeters, lonMeters);
        return distanceMeters <= query.radius ? [{ ...station, distanceMeters }] : [];
      });
      const stops = [...tmbStops, ...fgcStops, ...tramStops]
        .sort((left, right) => left.distanceMeters - right.distanceMeters)
        .slice(0, query.limit);

      return {
        data: stops,
        meta: { source: 'combined-transit', modes, radius: query.radius },
      };
    } catch (error) {
      fastify.log.error({ error: toSafeErrorDetails(error) }, 'Nearby stops upstream failed');
      return reply.status(502).send({ error: 'Upstream unavailable' });
    }
  });
};
