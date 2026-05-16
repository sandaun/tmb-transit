import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.TMB_APP_ID = process.env.TMB_APP_ID ?? 'test-app';
process.env.TMB_APP_KEY = process.env.TMB_APP_KEY ?? 'test-key';

describe('planner routes', async () => {
  const { createApp } = await import('../index');

  it('rejects invalid coordinates', async () => {
    const app = createApp();
    const response = await app.inject('/v1/planner/routes?fromLat=bad&fromLon=2&toLat=41&toLon=2');

    assert.equal(response.statusCode, 400);
    await app.close();
  });

  it('returns normalized route data', async () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          plan: {
            itineraries: [
              {
                duration: 600,
                walkDistance: 120,
                transfers: 0,
                legs: [
                  {
                    mode: 'BUS',
                    routeShortName: 'V19',
                    duration: 600,
                    from: { name: 'A', lat: 41.1, lon: 2.1 },
                    to: { name: 'B', lat: 41.2, lon: 2.2 },
                  },
                ],
              },
            ],
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );

    try {
      const app = createApp();
      const response = await app.inject(
        '/v1/planner/routes?fromLat=41.1&fromLon=2.1&toLat=41.2&toLon=2.2',
      );
      const json = response.json() as { data: Array<{ legs: Array<{ route?: string }> }> };

      assert.equal(response.statusCode, 200);
      assert.equal(json.data[0].legs[0].route, 'V19');
      await app.close();
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});
