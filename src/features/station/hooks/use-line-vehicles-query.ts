import { useQuery } from '@tanstack/react-query';

import { APP_CONFIG } from '@/src/config/app-config';
import { fetchFgcVehicles } from '@/src/data/tmb/client';
import type { TransportMode } from '@/src/domain/catalog/models';

export function useLineVehiclesQuery(mode: TransportMode, lineCode: string | null) {
  return useQuery({
    queryKey: ['realtime', mode, 'vehicles', lineCode],
    queryFn: () => fetchFgcVehicles(lineCode!),
    enabled: mode === 'fgc' && Boolean(lineCode),
    staleTime: 5_000,
    refetchInterval: mode === 'fgc' ? APP_CONFIG.arrivalsPollIntervalMs : false,
  });
}
