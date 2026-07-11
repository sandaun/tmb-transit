import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { APP_CONFIG } from '@/src/config/app-config';
import { readCatalogCache, writeCatalogCache } from '@/src/data/cache/catalog-cache';
import { fetchLines } from '@/src/data/tmb/data-source';
import type { Line, TransportMode } from '@/src/domain/catalog/models';

function isFresh(createdAt: number): boolean {
  return Date.now() - createdAt < APP_CONFIG.catalogTtlMs;
}

export async function fetchAndCacheLines(mode: TransportMode): Promise<Line[]> {
  const lines = await fetchLines(mode);
  await writeCatalogCache<Line[]>(`lines:${mode}`, lines);
  return lines;
}

export function useLinesQuery(mode: TransportMode) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['catalog', mode, 'lines'] as const, [mode]);
  const cacheKey = `lines:${mode}`;

  const query = useQuery({
    queryKey,
    queryFn: () => fetchAndCacheLines(mode),
    enabled: false,
  });
  const { refetch } = query;

  useEffect(() => {
    let isCancelled = false;

    async function bootstrap() {
      const cached = await readCatalogCache<Line[]>(cacheKey);

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
  }, [cacheKey, queryClient, queryKey, refetch]);

  return query;
}
