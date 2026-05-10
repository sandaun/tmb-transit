import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { APP_CONFIG } from '@/src/config/app-config';
import { fetchStationArrivals } from '@/src/data/tmb/data-source';
import type { TransportMode } from '@/src/domain/catalog/models';
import { useAppIsActive } from '@/src/core/use-app-active';

export function useStationArrivalsQuery(
  mode: TransportMode,
  lineCode: string | null,
  stationCode: string | null,
) {
  const isFocused = useIsFocused();
  const isAppActive = useAppIsActive();
  const shouldPoll = Boolean(lineCode && stationCode && isFocused && isAppActive);

  return useQuery({
    queryKey: ['realtime', mode, 'arrivals', lineCode, stationCode],
    queryFn: async () => {
      if (!lineCode || !stationCode) {
        return [];
      }

      return fetchStationArrivals(mode, lineCode, stationCode);
    },
    enabled: shouldPoll,
    staleTime: 5_000,
    refetchInterval: shouldPoll ? APP_CONFIG.arrivalsPollIntervalMs : false,
  });
}
