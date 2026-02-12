import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? '3001'),
  tmbAppId: required('TMB_APP_ID'),
  tmbAppKey: required('TMB_APP_KEY'),
  transitBaseUrl: process.env.TMB_TRANSIT_BASE_URL ?? 'https://api.tmb.cat/v1/transit',
  iMetroBaseUrl: process.env.TMB_IMETRO_BASE_URL ?? 'https://api.tmb.cat/v1/itransit',
} as const;

export const runtimeConfig = {
  realtimeCacheTtlMs: 8_000,
  realtimeStaleMaxMs: 30_000,
} as const;
