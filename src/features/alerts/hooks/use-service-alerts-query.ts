import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { APP_CONFIG } from '@/src/config/app-config';
import { useAppIsActive } from '@/src/core/use-app-active';
import { fetchServiceAlerts } from '@/src/data/tmb/data-source';

export function useServiceAlertsQuery() {
  const isFocused = useIsFocused();
  const isAppActive = useAppIsActive();
  const shouldPoll = isFocused && isAppActive;

  return useQuery({
    queryKey: ['service-alerts', 'v2'],
    queryFn: fetchServiceAlerts,
    enabled: shouldPoll,
    staleTime: 60_000,
    refetchInterval: shouldPoll ? APP_CONFIG.serviceAlertsPollIntervalMs : false,
    refetchIntervalInBackground: false,
  });
}
