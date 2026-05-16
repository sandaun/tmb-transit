import { useQuery } from '@tanstack/react-query';

import { fetchPlannedRoutes } from '@/src/data/tmb/data-source';
import type { PlannedRoute } from '@/src/domain/planner/models';

interface UsePlannedRoutesQueryOptions {
  enabled: boolean;
}

const QUERY_STALE_MS = 15_000;

function roundCoordinate(value: number): number {
  return Math.round(value * 100_000) / 100_000;
}

export function usePlannedRoutesQuery(
  from: { lat: number; lon: number } | null,
  to: { lat: number; lon: number } | null,
  { enabled }: UsePlannedRoutesQueryOptions,
) {
  return useQuery({
    queryKey: [
      'planner',
      'routes',
      from ? roundCoordinate(from.lat) : null,
      from ? roundCoordinate(from.lon) : null,
      to ? roundCoordinate(to.lat) : null,
      to ? roundCoordinate(to.lon) : null,
    ],
    queryFn: async (): Promise<PlannedRoute[]> => {
      if (!from || !to) {
        return [];
      }
      return fetchPlannedRoutes(from, to);
    },
    enabled: enabled && Boolean(from) && Boolean(to),
    staleTime: QUERY_STALE_MS,
  });
}
