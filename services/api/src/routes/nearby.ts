import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';

import { getAllFgcStations } from '../fgc/client';
import { getNearbyStops } from '../tmb/nearby-stops';
import type { TransportMode } from '../types/api';
import { toSafeErrorDetails } from '../utils/safe-logging';

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().int().min(50).max(2000).default(500),
  modes: z.string().default('metro,bus,fgc'),
  limit: z.coerce.number().int().min(1).max(200).default(80),
});

function parseModes(raw: string): TransportMode[] {
  const candidates = raw.split(',').map((value) => value.trim().toLowerCase());
  const result: TransportMode[] = [];
  for (const value of candidates) {
    if (value === 'metro' || value === 'bus' || value === 'fgc') {
      if (!result.includes(value)) {
        result.push(value);
      }
    }
  }
  if (result.length === 0) {
    return ['metro', 'bus', 'fgc'];
  }
  return result;
}

export const nearbyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/v1/nearby/stops', async (request, reply) => {
    const query = querySchema.parse(request.query);
    const modes = parseModes(query.modes);

    try {
      const tmbModes = modes.filter((mode): mode is 'metro' | 'bus' => mode !== 'fgc');
      const [tmbStops, fgcStations] = await Promise.all([
        tmbModes.length
          ? getNearbyStops({ lat: query.lat, lon: query.lon }, query.radius, tmbModes, query.limit)
          : Promise.resolve([]),
        modes.includes('fgc') ? getAllFgcStations() : Promise.resolve([]),
      ]);
      const fgcStops = fgcStations.flatMap((station) => {
        const latMeters = (station.lat - query.lat) * 111_320;
        const lonMeters =
          (station.lon - query.lon) * 111_320 * Math.cos((query.lat * Math.PI) / 180);
        const distanceMeters = Math.hypot(latMeters, lonMeters);
        return distanceMeters <= query.radius ? [{ ...station, distanceMeters }] : [];
      });
      const stops = [...tmbStops, ...fgcStops]
        .sort((left, right) => left.distanceMeters - right.distanceMeters)
        .slice(0, query.limit);

      return {
        data: stops,
        meta: { source: 'tmb-transit', modes, radius: query.radius },
      };
    } catch (error) {
      fastify.log.error({ error: toSafeErrorDetails(error) }, 'Nearby stops upstream failed');
      return reply.status(502).send({ error: 'Upstream unavailable' });
    }
  });
};
