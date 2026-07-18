import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.TMB_APP_ID = process.env.TMB_APP_ID ?? 'test-app';
process.env.TMB_APP_KEY = process.env.TMB_APP_KEY ?? 'test-key';

describe('planner client helpers', async () => {
  const { formatPlannerDate, formatPlannerTime, mapPlannerResponse } = await import(
    './planner-client'
  );

  it('formats date and time for TMB Planner', () => {
    const date = new Date(2026, 4, 15, 9, 7);

    assert.equal(formatPlannerDate(date), '05-15-2026');
    assert.equal(formatPlannerTime(date), '09:07am');
    assert.equal(formatPlannerTime(new Date(2026, 4, 15, 15, 30)), '03:30pm');
    assert.equal(formatPlannerTime(new Date(2026, 4, 15, 0, 0)), '12:00am');
  });

  it('maps walking and transit legs', () => {
    const routes = mapPlannerResponse({
      plan: {
        itineraries: [
          {
            duration: 1_500,
            startTime: 1_000,
            endTime: 2_500,
            walkDistance: 320.4,
            transfers: 1,
            legs: [
              {
                mode: 'WALK',
                duration: 180,
                distance: 210.2,
                from: { name: 'Origin', lat: 41.1, lon: 2.1 },
                to: { name: 'Stop A', lat: 41.2, lon: 2.2 },
              },
              {
                mode: 'BUS',
                routeShortName: 'H10',
                routeLongName: 'Badal - Olimpic de Badalona',
                agencyName: 'TMB',
                duration: 900,
                from: { name: 'Stop A', lat: 41.2, lon: 2.2 },
                to: { name: 'Stop B', lat: 41.3, lon: 2.3 },
              },
            ],
          },
        ],
      },
    });

    assert.equal(routes.length, 1);
    assert.equal(routes[0].durationSec, 1_500);
    assert.equal(routes[0].walkDistanceMeters, 320);
    assert.equal(routes[0].transfers, 1);
    assert.equal(routes[0].legs[0].mode, 'walk');
    assert.equal(routes[0].legs[1].mode, 'transit');
    assert.equal(routes[0].legs[1].route, 'H10');
  });

  it('returns an empty list when no route exists', () => {
    assert.deepEqual(mapPlannerResponse({ error: { noPath: true } }), []);
    assert.deepEqual(mapPlannerResponse({ plan: { itineraries: [] } }), []);
  });

  it('maps Trambaix transit legs as TRAM', () => {
    const [route] = mapPlannerResponse({
      plan: {
        itineraries: [{
          duration: 600,
          legs: [{
            mode: 'TRAM',
            routeShortName: 'T3',
            routeLongName: 'Sant Feliu - Francesc Macià',
            agencyName: 'TRAMBAIX',
            duration: 600,
            from: { name: 'Palau Reial', lat: 41.38, lon: 2.12 },
            to: { name: 'Francesc Macià', lat: 41.39, lon: 2.14 },
          }],
        }],
      },
    });

    assert.equal(route.legs[0].operator, 'tram');
    assert.equal(route.legs[0].transportMode, 'tram');
    assert.equal(route.legs[0].network, 'trambaix');
  });
});
