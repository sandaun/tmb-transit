import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.TMB_APP_ID = process.env.TMB_APP_ID ?? 'test-app';
process.env.TMB_APP_KEY = process.env.TMB_APP_KEY ?? 'test-key';
process.env.TRAM_CLIENT_ID = process.env.TRAM_CLIENT_ID ?? 'test-client';
process.env.TRAM_CLIENT_SECRET = process.env.TRAM_CLIENT_SECRET ?? 'test-secret';

describe('TRAM OAuth client', async () => {
  const { TramOAuthClient } = await import('./oauth');

  it('shares and reuses a valid token across concurrent requests', async () => {
    let tokenRequests = 0;
    let protectedRequests = 0;
    const client = new TramOAuthClient({
      baseUrl: 'https://tram.example',
      clientId: 'client',
      clientSecret: 'secret',
      fetcher: async (input) => {
        const url = String(input);
        if (url.endsWith('/connect/token')) {
          tokenRequests += 1;
          return Response.json({ access_token: 'shared-token', expires_in: 3_600 });
        }
        protectedRequests += 1;
        return new Response(null, { status: 200 });
      },
    });

    await Promise.all([
      client.fetch('/first'),
      client.fetch('/second'),
      client.fetch('/third'),
    ]);
    await client.fetch('/fourth');

    assert.equal(tokenRequests, 1);
    assert.equal(protectedRequests, 4);
  });

  it('renews early and retries a 401 exactly once', async () => {
    let nowMs = 0;
    let tokenRequests = 0;
    const authorizations: string[] = [];
    let shouldRejectToken = false;
    const client = new TramOAuthClient({
      baseUrl: 'https://tram.example',
      clientId: 'client',
      clientSecret: 'secret',
      now: () => nowMs,
      fetcher: async (input, init) => {
        const url = String(input);
        if (url.endsWith('/connect/token')) {
          tokenRequests += 1;
          return Response.json({
            access_token: `token-${tokenRequests}`,
            expires_in: 120,
          });
        }
        authorizations.push(new Headers(init?.headers).get('authorization') ?? '');
        if (shouldRejectToken) {
          shouldRejectToken = false;
          return new Response(null, { status: 401 });
        }
        return new Response(null, { status: 200 });
      },
    });

    await client.fetch('/resource');
    nowMs = 61_000;
    await client.fetch('/resource');
    shouldRejectToken = true;
    await client.fetch('/resource');

    assert.equal(tokenRequests, 3);
    assert.deepEqual(authorizations, [
      'Bearer token-1',
      'Bearer token-2',
      'Bearer token-2',
      'Bearer token-3',
    ]);
  });

  it('reports authentication errors without exposing credentials', async () => {
    const secret = 'never-print-this-secret';
    const client = new TramOAuthClient({
      baseUrl: 'https://tram.example',
      clientId: 'client',
      clientSecret: secret,
      fetcher: async () => new Response(null, { status: 500 }),
    });

    await assert.rejects(
      () => client.fetch('/resource'),
      (error: unknown) => error instanceof Error &&
        error.message.includes('status 500') &&
        !error.message.includes(secret),
    );
  });
});
