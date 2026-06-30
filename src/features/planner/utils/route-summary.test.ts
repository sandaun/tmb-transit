import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getRouteSummary,
  sortPlannedRoutes,
} from '@/src/features/planner/utils/route-summary';
import type { PlannedRoute } from '@/src/domain/planner/models';

describe('getRouteSummary', () => {
  it('summarizes transit routes and transfers', () => {
    const route: PlannedRoute = {
      id: 'route-1',
      durationSec: 1_380,
      walkDistanceMeters: 200,
      transfers: 1,
      legs: [
        {
          id: 'leg-1',
          mode: 'transit',
          route: 'L3',
          from: { name: 'A' },
          to: { name: 'B' },
          durationSec: 600,
          points: [],
        },
        {
          id: 'leg-2',
          mode: 'transit',
          route: 'H10',
          from: { name: 'B' },
          to: { name: 'C' },
          durationSec: 600,
          points: [],
        },
      ],
    };

    assert.equal(getRouteSummary(route), '23 min · L3 + H10 · 1 transfer');
  });
});

describe('sortPlannedRoutes', () => {
  it('orders options by duration before walk distance and transfers', () => {
    const routes: PlannedRoute[] = [
      {
        id: 'long-walk',
        durationSec: 4_920,
        walkDistanceMeters: 5_300,
        transfers: 0,
        legs: [],
      },
      {
        id: 'short-transit',
        durationSec: 2_400,
        walkDistanceMeters: 1_300,
        transfers: 0,
        legs: [],
      },
      {
        id: 'medium-transit',
        durationSec: 2_580,
        walkDistanceMeters: 1_600,
        transfers: 0,
        legs: [],
      },
    ];

    assert.deepEqual(
      sortPlannedRoutes(routes).map((route) => route.id),
      ['short-transit', 'medium-transit', 'long-walk'],
    );
  });

  it('keeps the original route list immutable', () => {
    const routes: PlannedRoute[] = [
      {
        id: 'second',
        durationSec: 1_200,
        walkDistanceMeters: 100,
        transfers: 0,
        legs: [],
      },
      {
        id: 'first',
        durationSec: 600,
        walkDistanceMeters: 500,
        transfers: 1,
        legs: [],
      },
    ];

    sortPlannedRoutes(routes);

    assert.deepEqual(
      routes.map((route) => route.id),
      ['second', 'first'],
    );
  });
});
