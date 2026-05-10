import { useQuery } from '@tanstack/react-query';

import { fetchLineSegments } from '@/src/data/tmb/data-source';
import type { TransportMode } from '@/src/domain/catalog/models';

export function useLineSegmentsQuery(mode: TransportMode, lineCode: string | null) {
  return useQuery({
    queryKey: ['catalog', mode, 'segments', lineCode],
    queryFn: async () => {
      if (!lineCode) {
        return [];
      }

      return fetchLineSegments(mode, lineCode);
    },
    enabled: Boolean(lineCode),
    staleTime: 60 * 60 * 1000,
  });
}
