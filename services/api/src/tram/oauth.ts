import { env } from '../config/env';
import { fetchWithTimeout } from '../tmb/http';

interface AccessToken {
  expiresAtMs: number;
  value: string;
}

interface TramOAuthOptions {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  fetcher?: TramFetcher;
  now?: () => number;
}

type TramFetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;

interface TokenResponse {
  access_token?: unknown;
  expires_in?: unknown;
}

const TOKEN_EXPIRY_MARGIN_MS = 60_000;

export class TramOAuthClient {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly fetcher: TramFetcher;
  private readonly now: () => number;
  private token: AccessToken | null = null;
  private tokenInFlight: Promise<AccessToken> | null = null;

  constructor(options: TramOAuthOptions) {
    this.baseUrl = options.baseUrl;
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.fetcher = options.fetcher ?? fetchWithTimeout;
    this.now = options.now ?? Date.now;
  }

  private async requestToken(): Promise<AccessToken> {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });
    const response = await this.fetcher(new URL('/connect/token', this.baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) {
      throw new Error(`TRAM authentication failed with status ${response.status}`);
    }

    const payload = (await response.json()) as TokenResponse;
    const value = typeof payload.access_token === 'string' ? payload.access_token : '';
    const expiresInSec = typeof payload.expires_in === 'number'
      ? payload.expires_in
      : Number(payload.expires_in);
    if (!value || !Number.isFinite(expiresInSec) || expiresInSec <= 0) {
      throw new Error('TRAM authentication returned an invalid token');
    }

    return {
      value,
      expiresAtMs: this.now() + expiresInSec * 1_000,
    };
  }

  private async getToken(forceRefresh = false): Promise<AccessToken> {
    if (!forceRefresh && this.token && this.token.expiresAtMs - TOKEN_EXPIRY_MARGIN_MS > this.now()) {
      return this.token;
    }
    if (this.tokenInFlight) {
      return this.tokenInFlight;
    }

    this.tokenInFlight = this.requestToken()
      .then((token) => {
        this.token = token;
        return token;
      })
      .finally(() => {
        this.tokenInFlight = null;
      });
    return this.tokenInFlight;
  }

  private async requestWithToken(
    input: string,
    init: RequestInit,
    token: AccessToken,
  ): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('authorization', `Bearer ${token.value}`);
    return this.fetcher(new URL(input, this.baseUrl), { ...init, headers });
  }

  async fetch(input: string, init: RequestInit = {}): Promise<Response> {
    const token = await this.getToken();
    const response = await this.requestWithToken(input, init, token);
    if (response.status !== 401) {
      return response;
    }

    if (this.token?.value === token.value) {
      this.token = null;
    }
    const refreshed = await this.getToken(true);
    return this.requestWithToken(input, init, refreshed);
  }
}

export const tramOAuthClient = new TramOAuthClient({
  baseUrl: env.tramOpenDataBaseUrl,
  clientId: env.tramClientId,
  clientSecret: env.tramClientSecret,
});
