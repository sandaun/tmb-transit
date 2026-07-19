import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Station } from '@/src/domain/catalog/models';
import type { Segment } from '@/src/domain/geo/models';
import {
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
