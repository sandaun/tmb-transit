export interface MapCameraCoordinate {
  latitude: number;
  longitude: number;
}

export interface MapCameraRegion extends MapCameraCoordinate {
  latitudeDelta: number;
  longitudeDelta: number;
}

interface MapViewport {
  height: number;
  topInset: number;
  bottomInset: number;
}

const VIEWPORT_MARGIN = 16;
const MINIMUM_VISIBLE_HEIGHT = 80;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getViewportFocusedRegion(
  coordinate: MapCameraCoordinate,
  currentRegion: MapCameraRegion,
  viewport: MapViewport,
): MapCameraRegion {
  if (viewport.height <= 0) {
    return {
      ...currentRegion,
      ...coordinate,
    };
  }

  const safeTop = clamp(
    viewport.topInset + VIEWPORT_MARGIN,
    0,
    viewport.height,
  );
  const proposedSafeBottom = clamp(
    viewport.height - viewport.bottomInset - VIEWPORT_MARGIN,
    0,
    viewport.height,
  );
  const safeBottom = Math.max(
    proposedSafeBottom,
    Math.min(viewport.height, safeTop + MINIMUM_VISIBLE_HEIGHT),
  );
  const visibleCenterY = (safeTop + safeBottom) / 2;
  const latitudeShift =
    ((viewport.height / 2 - visibleCenterY) / viewport.height) *
    currentRegion.latitudeDelta;

  return {
    latitude: coordinate.latitude - latitudeShift,
    longitude: coordinate.longitude,
    latitudeDelta: currentRegion.latitudeDelta,
    longitudeDelta: currentRegion.longitudeDelta,
  };
}
