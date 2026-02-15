import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { APP_CONFIG } from '@/src/config/app-config';
import { readCatalogCache, writeCatalogCache } from '@/src/data/cache/catalog-cache';
import { fetchMetroLines } from '@/src/data/tmb/data-source';
import type { Line } from '@/src/domain/catalog/models';

const queryKey = ['catalog', 'metro', 'lines'] as const;

function isFresh(createdAt: number): boolean {
  return Date.now() - createdAt < APP_CONFIG.catalogTtlMs;
}

export function useMetroLinesQuery() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const lines = await fetchMetroLines();
      await writeCatalogCache<Line[]>('lines', lines);
      return lines;
    },
    enabled: false,
  });
  const { refetch } = query;

  useEffect(() => {
    let isCancelled = false;

    async function bootstrap() {
      const cached = await readCatalogCache<Line[]>('lines');

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
  }, [queryClient, refetch]);

  return query;
}
