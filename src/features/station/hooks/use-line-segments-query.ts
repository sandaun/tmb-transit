import { useQuery } from '@tanstack/react-query';

import { fetchLineSegments } from '@/src/data/tmb/client';

export function useLineSegmentsQuery(lineCode: string | null) {
  return useQuery({
    queryKey: ['catalog', 'metro', 'segments', lineCode],
    queryFn: async () => {
      if (!lineCode) {
        return [];
      }

      return fetchLineSegments(lineCode);
    },
    enabled: Boolean(lineCode),
    staleTime: 60 * 60 * 1000,
  });
}
