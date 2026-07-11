import { useLocalSearchParams } from 'expo-router';

import type { TransportMode } from '@/src/domain/catalog/models';
import { StationScreen } from '@/src/features/station/components/station-screen';

function ensureString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function parseMode(value: string | string[] | undefined): TransportMode {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'bus' || raw === 'fgc') return raw;
  return 'metro';
}

export default function StationRoute() {
  const params = useLocalSearchParams<{
    lineCode?: string | string[];
    stationCode?: string | string[];
    mode?: string | string[];
  }>();

  return (
    <StationScreen
      lineCode={ensureString(params.lineCode)}
      mode={parseMode(params.mode)}
      stationCode={ensureString(params.stationCode)}
      showBackButton
      syncRoute
    />
  );
}
