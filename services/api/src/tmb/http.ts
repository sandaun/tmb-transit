import { runtimeConfig } from '../config/env';

/**
 * `fetch` wrapper that aborts the request after `runtimeConfig.upstreamTimeoutMs`.
 *
 * Every TMB upstream call goes through here so a hung connection can never block
 * a single-flight promise (and therefore every caller waiting on it) forever.
 * A caller-provided `signal` takes precedence when supplied.
 */
export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(input, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(runtimeConfig.upstreamTimeoutMs),
  });
}
