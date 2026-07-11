import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { APP_CONFIG } from '@/src/config/app-config';
import { useAppIsActive } from '@/src/core/use-app-active';
import { fetchServiceAlerts } from '@/src/data/tmb/data-source';
import { useAppLanguage } from '@/src/i18n';

export function useServiceAlertsQuery() {
  const isFocused = useIsFocused();
  const isAppActive = useAppIsActive();
  const shouldPoll = isFocused && isAppActive;
  const { language } = useAppLanguage();

  return useQuery({
    queryKey: ['service-alerts', 'v3', language],
    queryFn: () => fetchServiceAlerts(language),
    enabled: shouldPoll,
    staleTime: 60_000,
    refetchInterval: shouldPoll ? APP_CONFIG.serviceAlertsPollIntervalMs : false,
    refetchIntervalInBackground: false,
  });
}
