import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveAppConfig } from './app-config';

const DEVELOPMENT_INPUT = {
  appEnv: 'development',
  apiBaseUrl: undefined,
  useMock: undefined,
  nodeEnv: 'development',
} as const;

describe('resolveAppConfig', () => {
  it('uses local defaults in development', () => {
    assert.deepEqual(resolveAppConfig(DEVELOPMENT_INPUT), {
      appEnv: 'development',
      apiBaseUrl: 'http://localhost:3001',
      useMock: false,
    });
  });

  it('allows explicit mocks in development', () => {
    const config = resolveAppConfig({
      ...DEVELOPMENT_INPUT,
      useMock: 'true',
    });

    assert.equal(config.useMock, true);
  });

  it('requires an explicit API URL for preview and production', () => {
    for (const appEnv of ['preview', 'production']) {
      assert.throws(
        () => resolveAppConfig({ ...DEVELOPMENT_INPUT, appEnv }),
        new Error(`EXPO_PUBLIC_API_BASE_URL is required for ${appEnv}`),
      );
    }
  });

  it('rejects insecure and local URLs outside development', () => {
    for (const apiBaseUrl of ['http://api.example.com', 'https://localhost:3001']) {
      assert.throws(
        () =>
          resolveAppConfig({
            ...DEVELOPMENT_INPUT,
            appEnv: 'preview',
            apiBaseUrl,
          }),
        new Error('EXPO_PUBLIC_API_BASE_URL must use non-local HTTPS for preview'),
      );
    }
  });

  it('rejects mock mode outside development', () => {
    assert.throws(
      () =>
        resolveAppConfig({
          ...DEVELOPMENT_INPUT,
          appEnv: 'production',
          apiBaseUrl: 'https://api.example.com',
          useMock: 'true',
        }),
      new Error('EXPO_PUBLIC_USE_MOCK must be false for production'),
    );
  });

  it('treats a production Node environment as production by default', () => {
    assert.throws(
      () =>
        resolveAppConfig({
          ...DEVELOPMENT_INPUT,
          appEnv: undefined,
          nodeEnv: 'production',
        }),
      new Error('EXPO_PUBLIC_API_BASE_URL is required for production'),
    );
  });

  it('accepts an explicit secure remote configuration', () => {
    assert.deepEqual(
      resolveAppConfig({
        ...DEVELOPMENT_INPUT,
        appEnv: 'production',
        apiBaseUrl: 'https://api.example.com',
        useMock: 'false',
      }),
      {
        appEnv: 'production',
        apiBaseUrl: 'https://api.example.com',
        useMock: false,
      },
    );
  });
});
