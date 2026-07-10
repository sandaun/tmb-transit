import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mapPlannedRouteDto, mapServiceAlertDto } from '@/src/data/tmb/mappers';

describe('mapServiceAlertDto', () => {
  it('removes internal TMB prefixes from alert titles', () => {
    const cases = [
      ['NP3 Linia amb Servei Parcial', 'Linia amb Servei Parcial'],
      ['PP1 Servei parcial', 'Servei parcial'],
    ] as const;

    for (const [title, expectedTitle] of cases) {
      const alert = mapServiceAlertDto({
        id: 'alert-1',
        title,
        description: '',
        mode: 'metro',
        severity: 'disruption',
        kind: 'current',
        affectedLines: [],
        source: 'tmb-alerts-api',
      });

      assert.equal(alert.title, expectedTitle);
    }
  });
});

describe('mapPlannedRouteDto', () => {
  it('maps planned route DTOs to domain routes', () => {
    const route = mapPlannedRouteDto({
      id: 'route-1',
      durationSec: 1_200,
      walkDistanceMeters: 320,
      transfers: 1,
      legs: [
        {
          id: 'leg-1',
          mode: 'transit',
          route: 'L3',
          from: { name: 'Sants Estacio', lat: 41.3785, lon: 2.1407 },
          to: { name: 'Diagonal', lat: 41.395, lon: 2.1601 },
          durationSec: 900,
          points: [
            { lat: 41.3785, lon: 2.1407 },
            { lat: 41.395, lon: 2.1601 },
          ],
        },
      ],
    });

    assert.equal(route.legs[0].route, 'L3');
    assert.deepEqual(route.legs[0].points[1], { lat: 41.395, lon: 2.1601 });
  });
});
