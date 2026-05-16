import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getRouteSummary } from '@/src/features/planner/utils/route-summary';
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
