import test from 'node:test';
import assert from 'node:assert/strict';

import { TtlCache } from './ttl-cache';

test('returns fresh cached value until ttl expires', () => {
  const cache = new TtlCache<string>();
  const start = 1_000;

  cache.set('k', 'value', 500, start);

  assert.equal(cache.getFresh('k', start + 100), 'value');
  assert.equal(cache.getFresh('k', start + 600), null);
});

test('returns stale value if inside allowed max age', () => {
  const cache = new TtlCache<string>();
  const start = 1_000;

  cache.set('k', 'value', 100, start);

  assert.equal(cache.getStale('k', 30_000, start + 20_000), 'value');
  assert.equal(cache.getStale('k', 30_000, start + 40_000), null);
});
