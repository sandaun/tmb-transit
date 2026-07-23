import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Station } from '@/src/domain/catalog/models';
import type { LatLng, Segment } from '@/src/domain/geo/models';
import {
  placePointOnPolylines,
  selectStationMarkers,
  trimSegmentToStations,
} from '@/src/features/station/utils/map-route-geometry';

function makeStation(code: string, lon: number): Station {
  return {
    code,
    lineCode: 'test',
    mode: 'bus',
    name: code,
    lat: 41,
    lon,
  };
}

describe('selectStationMarkers', () => {
  const stations = [
    makeStation('a', 2),
    makeStation('b', 2.001),
    makeStation('c', 2.002),
    makeStation('d', 2.003),
    makeStation('e', 2.004),
  ];

  it('keeps every station when the map is zoomed in', () => {
    assert.deepEqual(
      selectStationMarkers(stations, 'c', 0.005).map((station) => station.code),
      ['a', 'b', 'c', 'd', 'e'],
    );
  });

  it('declutters dense routes while preserving terminals and selection', () => {
    assert.deepEqual(
      selectStationMarkers(stations, 'c', 0.05).map((station) => station.code),
      ['a', 'c', 'e'],
    );
  });
});

describe('trimSegmentToStations', () => {
  const points = [
    { lat: 41, lon: 2 },
    { lat: 41, lon: 2.001 },
    { lat: 41, lon: 2.002 },
    { lat: 41, lon: 2.003 },
    { lat: 41, lon: 2.004 },
  ];

  it('uses explicit segment endpoints to remove geometry beyond stations', () => {
    const segment: Segment = {
      id: 'segment',
      lineCode: 'test',
      mode: 'metro',
      fromStationCode: 'a',
      toStationCode: 'b',
      points,
    };
    const trimmed = trimSegmentToStations(segment, [
      makeStation('a', 2.001),
      makeStation('b', 2.003),
    ]);

    assert.deepEqual(trimmed[0], { lat: 41, lon: 2.001 });
    assert.deepEqual(trimmed.at(-1), { lat: 41, lon: 2.003 });
    assert.equal(trimmed.some((point) => point.lon === 2), false);
    assert.equal(trimmed.some((point) => point.lon === 2.004), false);
  });

  it('infers route bounds from nearby stations when endpoint codes are absent', () => {
    const segment: Segment = {
      id: 'segment',
      lineCode: 'test',
      mode: 'bus',
      points,
    };
    const trimmed = trimSegmentToStations(segment, [
      makeStation('a', 2.0012),
      makeStation('b', 2.0028),
    ]);

    assert.deepEqual(trimmed[0], { lat: 41, lon: 2.0012 });
    assert.deepEqual(trimmed.at(-1), { lat: 41, lon: 2.0028 });
  });

  it('keeps the source geometry when stations do not match the route', () => {
    const segment: Segment = {
      id: 'segment',
      lineCode: 'test',
      mode: 'bus',
      points,
    };

    assert.deepEqual(trimSegmentToStations(segment, [
      { ...makeStation('a', 3), lat: 42 },
      { ...makeStation('b', 3.001), lat: 42 },
    ]), points);
  });

  it('removes dead-end geometry that only extends beyond a terminal', () => {
    const segment: Segment = {
      id: 'terminal-tail',
      lineCode: 'test',
      mode: 'metro',
      points: [
        { lat: 41, lon: 2.003 },
        { lat: 41, lon: 2.004 },
      ],
    };
    const terminal = makeStation('terminal', 2.003);

    assert.deepEqual(
      trimSegmentToStations(segment, [makeStation('start', 2), terminal]),
      [{ lat: terminal.lat, lon: terminal.lon }],
    );
  });
});

describe('placePointOnPolylines', () => {
  // One latitude degree is ~111320 m, so 0.0009 deg sits ~100 m off the route.
  const route: LatLng[] = [
    { lat: 41.4, lon: 2.1 },
    { lat: 41.4, lon: 2.2 },
  ];
  const offRoutePoint: LatLng = { lat: 41.4009, lon: 2.15 };

  it('snaps a vehicle that drifted off the drawn route', () => {
    const placement = placePointOnPolylines([route], offRoutePoint, null, 150);

    assert.equal(placement.point.lat, 41.4);
    assert.ok(Math.abs(placement.point.lon - 2.15) < 1e-9);
    assert.equal(placement.bearingDegrees, null);
  });

  it('keeps the raw position when the route is further than the threshold', () => {
    assert.deepEqual(placePointOnPolylines([route], offRoutePoint, null, 50), {
      point: offRoutePoint,
      bearingDegrees: null,
    });
  });

  it('snaps to the closest of several polylines', () => {
    const farRoute: LatLng[] = [
      { lat: 41.41, lon: 2.1 },
      { lat: 41.41, lon: 2.2 },
    ];

    assert.equal(
      placePointOnPolylines([farRoute, route], offRoutePoint, null, 150).point.lat,
      41.4,
    );
  });

  it('keeps the raw position without a usable polyline', () => {
    assert.deepEqual(placePointOnPolylines([], offRoutePoint, null, 150), {
      point: offRoutePoint,
      bearingDegrees: null,
    });
    assert.deepEqual(
      placePointOnPolylines([[{ lat: 41.4, lon: 2.1 }]], offRoutePoint, null, 150),
      { point: offRoutePoint, bearingDegrees: null },
    );
  });

  it('keeps a non-finite position untouched', () => {
    const broken: LatLng = { lat: Number.NaN, lon: 2.15 };

    assert.deepEqual(placePointOnPolylines([route], broken, null, 150), {
      point: broken,
      bearingDegrees: null,
    });
  });

  it('points the bearing along the route towards the next stop', () => {
    // The east-west route runs at bearing 90 (east) / 270 (west).
    const towardsEast = placePointOnPolylines(
      [route],
      offRoutePoint,
      { lat: 41.4, lon: 2.19 },
      150,
    );
    const towardsWest = placePointOnPolylines(
      [route],
      offRoutePoint,
      { lat: 41.4, lon: 2.11 },
      150,
    );

    assert.equal(towardsEast.bearingDegrees, 90);
    assert.equal(towardsWest.bearingDegrees, 270);
  });

  it('reports no bearing when the next stop sits at the vehicle position', () => {
    const placement = placePointOnPolylines(
      [route],
      offRoutePoint,
      { lat: 41.4009, lon: 2.15 },
      150,
    );

    assert.equal(placement.bearingDegrees, null);
  });

  it('reports no bearing for an off-route vehicle even with a next stop', () => {
    const placement = placePointOnPolylines(
      [route],
      offRoutePoint,
      { lat: 41.4, lon: 2.19 },
      50,
    );

    assert.deepEqual(placement, { point: offRoutePoint, bearingDegrees: null });
  });
});
