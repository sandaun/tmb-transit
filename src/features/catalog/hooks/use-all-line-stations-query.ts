import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';

import type { Line, Station } from '@/src/domain/catalog/models';
import { fetchLineStations } from '@/src/data/tmb/data-source';

export function useAllLineStationsQuery(lines: Line[]) {
  const queries = useQueries({
    queries: lines.map((line) => ({
      queryKey: ['catalog', line.mode, 'stations', line.code] as const,
      queryFn: () => fetchLineStations(line.mode, line.code),
      staleTime: Number.POSITIVE_INFINITY,
    })),
  });

  const stationsByLine = useMemo(() => {
    const nextStationsByLine = new Map<string, Station[]>();

    lines.forEach((line, index) => {
      nextStationsByLine.set(line.code, queries[index]?.data ?? []);
    });

    return nextStationsByLine;
  }, [lines, queries]);

  const isLoading = queries.some((query) => query.isLoading);
  const isError = queries.some((query) => query.isError);

  return {
    isError,
    isLoading,
    stationsByLine,
  };
}
