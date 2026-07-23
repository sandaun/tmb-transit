import type { Station } from '@/src/domain/catalog/models';

export interface StationAnnotationCandidate {
  station: Pick<Station, 'code' | 'lat' | 'lon'>;
  hasName: boolean;
  hasBadges: boolean;
  selected: boolean;
}

export interface MapAnnotationViewport {
  width: number;
  height: number;
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface AnnotationRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// These bounds mirror the 44 pt marker, the 156 pt name label, and up to two
// route badges plus the overflow badge rendered by MapAdapter.
const MARKER_RADIUS = 24;
const BADGE_TOP_OFFSET = 36;
const BADGE_RIGHT_OFFSET = 132;
const UNSELECTED_NAME_HALF_WIDTH = 80;
const SELECTED_NAME_HALF_WIDTH = 84;
const UNSELECTED_NAME_BOTTOM_OFFSET = 58;
const SELECTED_NAME_BOTTOM_OFFSET = 82;
const COLLISION_GAP = 6;

function isValidViewport(viewport: MapAnnotationViewport): boolean {
  return (
    Number.isFinite(viewport.width) &&
    viewport.width > 0 &&
    Number.isFinite(viewport.height) &&
    viewport.height > 0 &&
    Number.isFinite(viewport.latitude) &&
    Number.isFinite(viewport.longitude) &&
    Number.isFinite(viewport.latitudeDelta) &&
    viewport.latitudeDelta > 0 &&
    Number.isFinite(viewport.longitudeDelta) &&
    viewport.longitudeDelta > 0
  );
}

function getAnnotationRect(
  candidate: StationAnnotationCandidate,
  viewport: MapAnnotationViewport,
): AnnotationRect {
  const x =
    viewport.width / 2 +
    ((candidate.station.lon - viewport.longitude) / viewport.longitudeDelta) * viewport.width;
  const y =
    viewport.height / 2 -
    ((candidate.station.lat - viewport.latitude) / viewport.latitudeDelta) * viewport.height;
  let left = x - MARKER_RADIUS;
  let right = x + MARKER_RADIUS;
  let top = y - MARKER_RADIUS;
  let bottom = y + MARKER_RADIUS;

  if (candidate.hasBadges) {
    top = Math.min(top, y - BADGE_TOP_OFFSET);
    right = Math.max(right, x + BADGE_RIGHT_OFFSET);
  }

  if (candidate.hasName) {
    const nameHalfWidth = candidate.selected
      ? SELECTED_NAME_HALF_WIDTH
      : UNSELECTED_NAME_HALF_WIDTH;
    const nameBottomOffset = candidate.selected
      ? SELECTED_NAME_BOTTOM_OFFSET
      : UNSELECTED_NAME_BOTTOM_OFFSET;
    left = Math.min(left, x - nameHalfWidth);
    right = Math.max(right, x + nameHalfWidth);
    bottom = Math.max(bottom, y + nameBottomOffset);
  }

  return { left, right, top, bottom };
}

function intersects(first: AnnotationRect, second: AnnotationRect): boolean {
  return (
    first.left < second.right + COLLISION_GAP &&
    first.right + COLLISION_GAP > second.left &&
    first.top < second.bottom + COLLISION_GAP &&
    first.bottom + COLLISION_GAP > second.top
  );
}

function intersectsViewport(rect: AnnotationRect, viewport: MapAnnotationViewport): boolean {
  return (
    rect.right >= 0 &&
    rect.left <= viewport.width &&
    rect.bottom >= 0 &&
    rect.top <= viewport.height
  );
}

export function getVisibleStationAnnotationCodes(
  candidates: StationAnnotationCandidate[],
  viewport: MapAnnotationViewport,
): Set<string> {
  const seenCodes = new Set<string>();
  const uniqueCandidates = candidates.filter((candidate) => {
    if (
      !Number.isFinite(candidate.station.lat) ||
      !Number.isFinite(candidate.station.lon) ||
      seenCodes.has(candidate.station.code)
    ) {
      return false;
    }

    seenCodes.add(candidate.station.code);
    return true;
  });

  if (!isValidViewport(viewport) || uniqueCandidates.length <= 1) {
    return new Set(uniqueCandidates.map((candidate) => candidate.station.code));
  }

  const orderedCandidates = uniqueCandidates
    .map((candidate, index) => ({ candidate, index }))
    .sort(
      (first, second) =>
        Number(second.candidate.selected) - Number(first.candidate.selected) ||
        first.index - second.index,
    );
  const visibleCodes = new Set<string>();
  const occupiedRects: AnnotationRect[] = [];

  for (const { candidate } of orderedCandidates) {
    const rect = getAnnotationRect(candidate, viewport);
    if (!intersectsViewport(rect, viewport)) {
      continue;
    }

    if (occupiedRects.some((occupiedRect) => intersects(rect, occupiedRect))) {
      continue;
    }

    visibleCodes.add(candidate.station.code);
    occupiedRects.push(rect);
  }

  return visibleCodes;
}
