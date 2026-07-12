import { useLocalSearchParams } from 'expo-router';

import type { TransportMode } from '@/src/domain/catalog/models';
import { LineStationsScreen } from '@/src/features/catalog/components/line-stations-screen';

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

export default function LineStationsRoute() {
  const params = useLocalSearchParams<{
    mode?: string | string[];
    lineCode?: string | string[];
  }>();

  return (
    <LineStationsScreen
      mode={parseMode(params.mode)}
      lineCode={ensureString(params.lineCode)}
    />
  );
}
