export interface GeoFeature {
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
  properties?: Record<string, unknown>;
}

export interface GeoFeatureCollection {
  features?: GeoFeature[];
}

function readProperty(props: Record<string, unknown>, candidates: string[]): unknown {
  for (const candidate of candidates) {
    if (candidate in props) {
      return props[candidate];
    }
  }

  return undefined;
}

export function asString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

export function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

export function getString(props: Record<string, unknown>, candidates: string[]): string | undefined {
  return asString(readProperty(props, candidates));
}

export function getNumber(props: Record<string, unknown>, candidates: string[]): number | undefined {
  return asNumber(readProperty(props, candidates));
}

export function toLatLonFromPoint(geometry: GeoFeature['geometry']): { lat: number; lon: number } | null {
  if (!geometry || geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) {
    return null;
  }

  const [lonRaw, latRaw] = geometry.coordinates;
  const lon = asNumber(lonRaw);
  const lat = asNumber(latRaw);

  if (lat === undefined || lon === undefined) {
    return null;
  }

  return { lat, lon };
}

export function toLinePoints(geometry: GeoFeature['geometry']): Array<{ lat: number; lon: number }> {
  if (!geometry || !geometry.coordinates) {
    return [];
  }

  if (geometry.type === 'LineString' && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates
      .map((coordinate) => {
        if (!Array.isArray(coordinate)) {
          return null;
        }

        const lon = asNumber(coordinate[0]);
        const lat = asNumber(coordinate[1]);
        if (lat === undefined || lon === undefined) {
          return null;
        }

        return { lat, lon };
      })
      .filter((point): point is { lat: number; lon: number } => point !== null);
  }

  if (geometry.type === 'MultiLineString' && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.flatMap((line) => {
      if (!Array.isArray(line)) {
        return [];
      }

      return line
        .map((coordinate) => {
          if (!Array.isArray(coordinate)) {
            return null;
          }

          const lon = asNumber(coordinate[0]);
          const lat = asNumber(coordinate[1]);
          if (lat === undefined || lon === undefined) {
            return null;
          }

          return { lat, lon };
        })
        .filter((point): point is { lat: number; lon: number } => point !== null);
    });
  }

  return [];
}
