import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { APP_CONFIG } from '@/src/config/app-config';
import { fetchStationArrivals } from '@/src/data/tmb/data-source';
import { useAppIsActive } from '@/src/core/use-app-active';

export function useStationArrivalsQuery(lineCode: string | null, stationCode: string | null) {
  const isFocused = useIsFocused();
  const isAppActive = useAppIsActive();
  const shouldPoll = Boolean(lineCode && stationCode && isFocused && isAppActive);

  return useQuery({
    queryKey: ['realtime', 'arrivals', lineCode, stationCode],
    queryFn: async () => {
      if (!lineCode || !stationCode) {
        return [];
      }

      return fetchStationArrivals(lineCode, stationCode);
    },
    enabled: shouldPoll,
    staleTime: 5_000,
    refetchInterval: shouldPoll ? APP_CONFIG.arrivalsPollIntervalMs : false,
  });
}
