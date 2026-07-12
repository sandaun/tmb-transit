import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { APP_CONFIG } from '@/src/config/app-config';
import { readCatalogCache, writeCatalogCache } from '@/src/data/cache/catalog-cache';
import { fetchLineSegments } from '@/src/data/tmb/data-source';
import type { TransportMode } from '@/src/domain/catalog/models';
import type { Segment } from '@/src/domain/geo/models';

function isFresh(createdAt: number): boolean {
  return Date.now() - createdAt < APP_CONFIG.catalogTtlMs;
}

export async function fetchAndCacheLineSegments(
  mode: TransportMode,
  lineCode: string,
): Promise<Segment[]> {
  const segments = await fetchLineSegments(mode, lineCode);
  await writeCatalogCache<Segment[]>(`segments:${mode}:${lineCode}`, segments);
  return segments;
}

export function useLineSegmentsQuery(mode: TransportMode, lineCode: string | null) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ['catalog', mode, 'segments', lineCode] as const,
    [lineCode, mode],
  );

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!lineCode) {
        return [];
      }

      return fetchAndCacheLineSegments(mode, lineCode);
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
      const cacheKey = `segments:${mode}:${lineCode}`;
      const cached = await readCatalogCache<Segment[]>(cacheKey);

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
