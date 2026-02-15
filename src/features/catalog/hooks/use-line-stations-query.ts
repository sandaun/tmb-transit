import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { APP_CONFIG } from '@/src/config/app-config';
import { readCatalogCache, writeCatalogCache } from '@/src/data/cache/catalog-cache';
import { fetchLineStations } from '@/src/data/tmb/data-source';
import type { Station } from '@/src/domain/catalog/models';

function isFresh(createdAt: number): boolean {
  return Date.now() - createdAt < APP_CONFIG.catalogTtlMs;
}

export function useLineStationsQuery(lineCode: string | null) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['catalog', 'metro', 'stations', lineCode] as const, [lineCode]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!lineCode) {
        return [];
      }

      const stations = await fetchLineStations(lineCode);
      await writeCatalogCache<Station[]>(`stations:${lineCode}`, stations);
      return stations;
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
      const cacheKey = `stations:${lineCode}`;
      const cached = await readCatalogCache<Station[]>(cacheKey);

      if (!cached || isCancelled) {
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
  }, [lineCode, queryClient, queryKey, refetch]);

  return query;
}
