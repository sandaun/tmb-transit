import { useQuery } from '@tanstack/react-query';

import { fetchNearbyStops } from '@/src/data/tmb/data-source';
import type { TransportMode } from '@/src/domain/catalog/models';
import type { LatLng } from '@/src/domain/geo/models';
import type { NearbyStop } from '@/src/domain/nearby/models';

export type { NearbyStop } from '@/src/domain/nearby/models';

interface UseNearbyStopsQueryOptions {
  modes: TransportMode[];
  radiusMeters: number;
  enabled: boolean;
}

const QUERY_STALE_MS = 60_000;

export function useNearbyStopsQuery(
  center: LatLng | null,
  { modes, radiusMeters, enabled }: UseNearbyStopsQueryOptions,
) {
  const roundedLat = center ? Math.round(center.lat * 1_000) / 1_000 : null;
  const roundedLon = center ? Math.round(center.lon * 1_000) / 1_000 : null;
  const modesKey = [...modes].sort().join(',');

  return useQuery({
    queryKey: ['nearby', 'stops', roundedLat, roundedLon, radiusMeters, modesKey],
    queryFn: async () => {
      if (!center) {
        return [] as NearbyStop[];
      }
      return fetchNearbyStops(center, modes, radiusMeters);
    },
    enabled: enabled && Boolean(center) && modes.length > 0,
    staleTime: QUERY_STALE_MS,
  });
}
