import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PlannedLeg, PlannedRoute } from '@/src/domain/planner/models';
import {
  buildRouteLandmarks,
  buildRoutePolylines,
  getPlannerRouteMode,
} from '@/src/features/planner/utils/route-presentation';

function createLeg(overrides: Partial<PlannedLeg> & Pick<PlannedLeg, 'id'>): PlannedLeg {
  return {
    mode: 'walk',
    from: { name: 'Origin', lat: 41.38, lon: 2.17 },
    to: { name: 'Destination', lat: 41.39, lon: 2.18 },
    durationSec: 300,
    points: [],
    ...overrides,
  };
}

function createRoute(legs: PlannedLeg[]): PlannedRoute {
  return {
    id: 'route',
    durationSec: legs.reduce((total, leg) => total + leg.durationSec, 0),
    walkDistanceMeters: 500,
    transfers: Math.max(0, legs.filter((leg) => leg.mode === 'transit').length - 1),
    legs,
  };
}

describe('buildRouteLandmarks', () => {
  it('returns only endpoints for a walking route', () => {
    const landmarks = buildRouteLandmarks(createRoute([createLeg({ id: 'walk' })]));
    assert.deepEqual(landmarks.map((landmark) => landmark.kind), ['origin', 'destination']);
  });

  it('derives boarding and alighting for a direct route', () => {
    const route = createRoute([
      createLeg({
        id: 'walk-in',
        to: { name: 'Tarragona', lat: 41.378, lon: 2.145 },
      }),
      createLeg({
        id: 'l3',
        mode: 'transit',
        route: 'L3',
        from: { name: 'Tarragona', lat: 41.378, lon: 2.145 },
        to: { name: 'Lesseps', lat: 41.406, lon: 2.149 },
      }),
      createLeg({
        id: 'walk-out',
        from: { name: 'Lesseps', lat: 41.406, lon: 2.149 },
      }),
    ]);

    const landmarks = buildRouteLandmarks(route);
    assert.deepEqual(
      landmarks.map((landmark) => landmark.kind),
      ['origin', 'boarding', 'alighting', 'destination'],
    );
  });

  it('links a walking transfer to its incoming and outgoing routes', () => {
    const route = createRoute([
      createLeg({
        id: 'l3',
        mode: 'transit',
        route: 'L3',
        from: { name: 'Tarragona', lat: 41.378, lon: 2.145 },
        to: { name: 'Catalunya', lat: 41.387, lon: 2.17 },
      }),
      createLeg({
        id: 'transfer-walk',
        from: { name: 'Catalunya', lat: 41.387, lon: 2.17 },
        to: { name: 'Catalunya', lat: 41.38701, lon: 2.17001 },
        distanceMeters: 45,
      }),
      createLeg({
        id: 'l7',
        mode: 'transit',
        route: 'L7',
        from: { name: 'Catalunya', lat: 41.38701, lon: 2.17001 },
        to: { name: 'Plaça Molina', lat: 41.401, lon: 2.147 },
      }),
    ]);

    const transfer = buildRouteLandmarks(route).find(
      (landmark) => landmark.kind === 'transfer',
    );
    assert.deepEqual(transfer, {
      id: 'transfer:l3:l7',
      kind: 'transfer',
      name: 'Catalunya',
      coordinate: { lat: 41.38701, lon: 2.17001 },
      legId: 'transfer-walk',
      incomingRoute: 'L3',
      outgoingRoute: 'L7',
    });
  });

  it('derives every transfer across multiple transit legs', () => {
    const route = createRoute([
      createLeg({
        id: 'l3',
        mode: 'transit',
        route: 'L3',
        from: { name: 'Tarragona', lat: 41.378, lon: 2.145 },
        to: { name: 'Catalunya', lat: 41.387, lon: 2.17 },
      }),
      createLeg({
        id: 'l7',
        mode: 'transit',
        route: 'L7',
        from: { name: 'Catalunya', lat: 41.3871, lon: 2.1701 },
        to: { name: 'Gràcia', lat: 41.4, lon: 2.152 },
      }),
      createLeg({
        id: 'v17',
        mode: 'transit',
        route: 'V17',
        from: { name: 'Gràcia', lat: 41.4001, lon: 2.1521 },
        to: { name: 'Vallcarca', lat: 41.411, lon: 2.144 },
      }),
    ]);

    const transfers = buildRouteLandmarks(route).filter(
      (landmark) => landmark.kind === 'transfer',
    );
    assert.deepEqual(
      transfers.map((landmark) => [landmark.incomingRoute, landmark.outgoingRoute]),
      [['L3', 'L7'], ['L7', 'V17']],
    );
  });

  it('omits landmarks without valid coordinates', () => {
    const route = createRoute([
      createLeg({
        id: 'transit',
        mode: 'transit',
        route: 'L3',
        from: { name: 'Unknown' },
        to: { name: 'Also unknown' },
      }),
    ]);
    assert.deepEqual(buildRouteLandmarks(route), []);
  });

  it('preserves transit roles when endpoints share the same coordinate', () => {
    const route = createRoute([
      createLeg({
        id: 'transit',
        mode: 'transit',
        route: 'L3',
        from: { name: 'Tarragona', lat: 41.378, lon: 2.145 },
        to: { name: 'Lesseps', lat: 41.406, lon: 2.149 },
      }),
    ]);
    assert.deepEqual(
      buildRouteLandmarks(route).map((landmark) => landmark.kind),
      ['origin', 'boarding', 'alighting', 'destination'],
    );
  });
});

describe('buildRoutePolylines', () => {
  it('uses the walk color, line color, and hides short internal transfers', () => {
    const route = createRoute([
      createLeg({ id: 'walk-in', points: [{ lat: 1, lon: 1 }, { lat: 2, lon: 2 }] }),
      createLeg({ id: 'l3', mode: 'transit', route: 'L3', points: [{ lat: 2, lon: 2 }, { lat: 3, lon: 3 }] }),
      createLeg({ id: 'transfer', distanceMeters: 20, points: [{ lat: 3, lon: 3 }, { lat: 3.1, lon: 3.1 }] }),
      createLeg({ id: 'l7', mode: 'transit', route: 'L7', points: [{ lat: 3.1, lon: 3.1 }, { lat: 4, lon: 4 }] }),
    ]);

    const polylines = buildRoutePolylines(route, '#FF6600');
    assert.deepEqual(polylines.map((polyline) => polyline.id), ['walk-in', 'l3', 'l7']);
    assert.equal(polylines[0].color, '#FF6600');
    assert.notEqual(polylines[1].color, '#FF6600');
  });
});

describe('getPlannerRouteMode', () => {
  it('classifies metro route codes and defaults other routes to bus', () => {
    assert.equal(getPlannerRouteMode('L3'), 'metro');
    assert.equal(getPlannerRouteMode('FM'), 'metro');
    assert.equal(getPlannerRouteMode('H10'), 'bus');
    assert.equal(getPlannerRouteMode('S1', 'FGC'), 'fgc');
    assert.equal(getPlannerRouteMode('T3', 'TRAMBAIX'), 'tram');
    assert.equal(getPlannerRouteMode(undefined), 'bus');
  });
});
