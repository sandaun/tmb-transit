import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { APP_CONFIG } from '@/src/config/app-config';
import { readCatalogCache, writeCatalogCache } from '@/src/data/cache/catalog-cache';
import { fetchLineStations } from '@/src/data/tmb/data-source';
import type { Station, TransportMode } from '@/src/domain/catalog/models';

function isFresh(createdAt: number): boolean {
  return Date.now() - createdAt < APP_CONFIG.catalogTtlMs;
}

export async function fetchAndCacheLineStations(
  mode: TransportMode,
  lineCode: string,
): Promise<Station[]> {
  const stations = await fetchLineStations(mode, lineCode);
  await writeCatalogCache<Station[]>(`stations:${mode}:${lineCode}`, stations);
  return stations;
}

export function useLineStationsQuery(mode: TransportMode, lineCode: string | null) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ['catalog', mode, 'stations', lineCode] as const,
    [lineCode, mode],
  );

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!lineCode) {
        return [];
      }

      return fetchAndCacheLineStations(mode, lineCode);
    },
    enabled: false,
  });
  const { refetch } = query;

  useEffect(() => {
    if (!lineCode) {
      return;
    }

    let isCancelled = false;

    async function bootstrap() {
      const cacheKey = `stations:${mode}:${lineCode}`;
      const cached = await readCatalogCache<Station[]>(cacheKey);

      if (isCancelled) {
        return;
      }

      if (!cached) {
        await refetch();
        return;
      }

      queryClient.setQueryData(queryKey, cached.data);

      if (!isFresh(cached.createdAt)) {
        await refetch();
      }
    }

    void bootstrap();

    return () => {
      isCancelled = true;
    };
  }, [lineCode, mode, queryClient, queryKey, refetch]);

  return query;
}
