import type { LatLng } from './models';

export function clamp01(value: number): number {
  if (value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 1;
  }

  return value;
}

export function interpolateOnSegment(from: LatLng, to: LatLng, progress: number): LatLng {
  const t = clamp01(progress);

  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lon: from.lon + (to.lon - from.lon) * t,
  };
}
