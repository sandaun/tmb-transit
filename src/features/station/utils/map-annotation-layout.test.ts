import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Station } from '@/src/domain/catalog/models';
import {
  getVisibleStationAnnotationCodes,
  type MapAnnotationViewport,
  type StationAnnotationCandidate,
} from '@/src/features/station/utils/map-annotation-layout';

const viewport: MapAnnotationViewport = {
  width: 400,
  height: 800,
  latitude: 41,
  longitude: 2,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

function makeCandidate(
  code: string,
  lon: number,
  options: Partial<Pick<StationAnnotationCandidate, 'hasName' | 'hasBadges' | 'selected'>> = {},
): StationAnnotationCandidate {
  const station: Pick<Station, 'code' | 'lat' | 'lon'> = {
    code,
    lat: 41,
    lon,
  };

  return {
    station,
    hasName: true,
    hasBadges: true,
    selected: false,
    ...options,
  };
}

describe('getVisibleStationAnnotationCodes', () => {
  it('keeps the selected annotation and suppresses a colliding neighbor', () => {
    const visibleCodes = getVisibleStationAnnotationCodes([
      makeCandidate('neighbor', 2),
      makeCandidate('selected', 2.008, { selected: true }),
    ], viewport);

    assert.deepEqual(Array.from(visibleCodes), ['selected']);
  });

  it('keeps separated annotations visible', () => {
    const visibleCodes = getVisibleStationAnnotationCodes([
      makeCandidate('first', 2),
      makeCandidate('second', 2.025),
    ], viewport);

    assert.deepEqual(Array.from(visibleCodes), ['first', 'second']);
  });

  it('uses input order as the stable priority for unselected annotations', () => {
    const visibleCodes = getVisibleStationAnnotationCodes([
      makeCandidate('first', 2),
      makeCandidate('second', 2.008),
    ], viewport);

    assert.deepEqual(Array.from(visibleCodes), ['first']);
  });

  it('reveals annotations as the user zooms in', () => {
    const candidates = [
      makeCandidate('first', 2),
      makeCandidate('second', 2.002),
    ];
    const visibleCodes = getVisibleStationAnnotationCodes(candidates, {
      ...viewport,
      longitude: 2.001,
      latitudeDelta: 0.0035,
      longitudeDelta: 0.0035,
    });

    assert.deepEqual(Array.from(visibleCodes), ['first', 'second']);
  });

  it('does not let an offscreen annotation suppress an onscreen station', () => {
    const visibleCodes = getVisibleStationAnnotationCodes([
      makeCandidate('offscreen', 1.95),
      makeCandidate('onscreen', 2),
    ], viewport);

    assert.deepEqual(Array.from(visibleCodes), ['onscreen']);
  });

  it('falls back to every annotation before the viewport is measured', () => {
    const visibleCodes = getVisibleStationAnnotationCodes([
      makeCandidate('first', 2),
      makeCandidate('second', 2.008),
    ], {
      ...viewport,
      width: 0,
    });

    assert.deepEqual(Array.from(visibleCodes), ['first', 'second']);
  });
});
