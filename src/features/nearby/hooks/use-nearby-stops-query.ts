import { useQuery } from '@tanstack/react-query';

import { APP_CONFIG } from '@/src/config/app-config';
import { mapStationDto } from '@/src/data/tmb/mappers';
import type { StationDto } from '@/src/data/tmb/types';
import type { Station, TransportMode } from '@/src/domain/catalog/models';
import type { LatLng } from '@/src/domain/geo/models';

export interface NearbyStop extends Station {
  distanceMeters: number;
}

interface NearbyStopDto extends StationDto {
  distanceMeters: number;
}

interface UseNearbyStopsQueryOptions {
  modes: TransportMode[];
  radiusMeters: number;
  enabled: boolean;
}

const QUERY_STALE_MS = 60_000;

async function fetchNearby(
  center: LatLng,
  modes: TransportMode[],
  radiusMeters: number,
): Promise<NearbyStop[]> {
  const params = new URLSearchParams({
    lat: String(center.lat),
    lon: String(center.lon),
    radius: String(radiusMeters),
    modes: modes.join(','),
  });

  const response = await fetch(
    `${APP_CONFIG.apiBaseUrl}/v1/nearby/stops?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`Nearby request failed: ${response.status}`);
  }

  const json = (await response.json()) as { data: NearbyStopDto[] };

  return json.data.map((dto) => ({
    ...mapStationDto(dto),
    distanceMeters: dto.distanceMeters,
  }));
}

export function useNearbyStopsQuery(
  center: LatLng | null,
  { modes, radiusMeters, enabled }: UseNearbyStopsQueryOptions,
) {
  const roundedLat = center ? Math.round(center.lat * 1_000) / 1_000 : null;
  const roundedLon = center ? Math.round(center.lon * 1_000) / 1_000 : null;
  const modesKey = [...modes].sort().join(',');

  return useQuery({
    queryKey: ['nearby', 'stops', roundedLat, roundedLon, radiusMeters, modesKey],
    queryFn: async () => {
      if (!center) {
        return [] as NearbyStop[];
      }
      return fetchNearby(center, modes, radiusMeters);
    },
    enabled: enabled && Boolean(center) && modes.length > 0,
    staleTime: QUERY_STALE_MS,
  });
}
