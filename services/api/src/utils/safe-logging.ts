import type { FastifyRequest } from 'fastify';
import type { Writable } from 'node:stream';

const REDACTED_VALUE = 'redacted';
const SENSITIVE_QUERY_PARAMETERS = [
  'lat',
  'lon',
  'fromLat',
  'fromLon',
  'toLat',
  'toLon',
] as const;

export function redactSensitiveQueryParameters(value: string): string {
  const queryStart = value.indexOf('?');
  if (queryStart === -1) {
    return value;
  }

  const path = value.slice(0, queryStart);
  const queryAndFragment = value.slice(queryStart + 1);
  const fragmentStart = queryAndFragment.indexOf('#');
  const query = fragmentStart === -1 ? queryAndFragment : queryAndFragment.slice(0, fragmentStart);
  const fragment = fragmentStart === -1 ? '' : queryAndFragment.slice(fragmentStart);
  const parameters = new URLSearchParams(query);
  let redacted = false;

  for (const parameter of SENSITIVE_QUERY_PARAMETERS) {
    if (parameters.has(parameter)) {
      parameters.set(parameter, REDACTED_VALUE);
      redacted = true;
    }
  }

  if (!redacted) {
    return value;
  }

  return `${path}?${parameters.toString()}${fragment}`;
}

export function toSafeErrorDetails(error: unknown): { name: string; message: string } {
  if (!(error instanceof Error)) {
    return {
      name: 'UnknownError',
      message: 'An unknown error occurred',
    };
  }

  return {
    name: error.name,
    message: redactSensitiveQueryParameters(error.message),
  };
}

function serializeRequest(request: FastifyRequest) {
  return {
    method: request.method,
    url: redactSensitiveQueryParameters(request.url),
    hostname: request.hostname,
    remoteAddress: request.ip,
    remotePort: request.socket.remotePort,
  };
}

export function createLoggerOptions(stream?: Writable) {
  return {
    ...(stream ? { stream } : {}),
    serializers: {
      req: serializeRequest,
    },
  };
}
