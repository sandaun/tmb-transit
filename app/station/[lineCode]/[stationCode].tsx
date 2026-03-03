import { useLocalSearchParams } from 'expo-router';

import { StationScreen } from '@/src/features/station/components/station-screen';

function ensureString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

export default function StationRoute() {
  const params = useLocalSearchParams<{ lineCode?: string | string[]; stationCode?: string | string[] }>();

  return (
    <StationScreen
      lineCode={ensureString(params.lineCode)}
      stationCode={ensureString(params.stationCode)}
      showBackButton
      syncRoute
    />
  );
}
