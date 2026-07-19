import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { describe, it } from 'node:test';
import Fastify from 'fastify';

import {
  createLoggerOptions,
  redactSensitiveQueryParameters,
  toSafeErrorDetails,
} from './safe-logging';

describe('safe logging', () => {
  it('redacts location query parameters while preserving other parameters', () => {
    const redacted = redactSensitiveQueryParameters(
      '/v1/planner/routes?fromLat=41.387&fromLon=2.17&toLat=41.4&toLon=2.2&mode=metro',
    );

    assert.equal(
      redacted,
      '/v1/planner/routes?fromLat=redacted&fromLon=redacted&toLat=redacted&toLon=redacted&mode=metro',
    );
  });

  it('removes coordinates from captured Fastify request logs', async () => {
    let output = '';
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        output += chunk.toString();
        callback();
      },
    });
    const app = Fastify({ logger: createLoggerOptions(stream) });
    app.get('/check', async () => ({ ok: true }));

    await app.inject('/check?lat=41.387917&lon=2.169918');
    await app.close();

    assert.doesNotMatch(output, /41\.387917|2\.169918/);
    assert.doesNotMatch(output, /remoteAddress|remotePort|127\.0\.0\.1/);
    assert.match(output, /lat=redacted/);
    assert.match(output, /lon=redacted/);
  });

  it('redacts coordinates embedded in error URLs without logging stacks', () => {
    const details = toSafeErrorDetails(
      new Error('Request failed: https://example.com/path?lat=41.387&lon=2.17'),
    );

    assert.deepEqual(details, {
      name: 'Error',
      message: 'Request failed: https://example.com/path?lat=redacted&lon=redacted',
    });
    assert.doesNotMatch(JSON.stringify(details), /41\.387|2\.17/);
  });
});
