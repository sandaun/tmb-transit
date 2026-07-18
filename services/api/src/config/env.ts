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
  iBusBaseUrl: process.env.TMB_IBUS_BASE_URL ?? 'https://api.tmb.cat/v1/ibus',
  plannerBaseUrl: process.env.TMB_PLANNER_BASE_URL ?? 'https://api.tmb.cat/v1/planner',
  alertsBaseUrl: process.env.TMB_ALERTS_BASE_URL ?? 'https://api.tmb.cat/v1/alerts',
  tramClientId: required('TRAM_CLIENT_ID'),
  tramClientSecret: required('TRAM_CLIENT_SECRET'),
  tramOpenDataBaseUrl:
    process.env.TRAM_OPEN_DATA_BASE_URL ?? 'https://opendata.tram.cat',
  fgcOpenDataBaseUrl:
    process.env.FGC_OPEN_DATA_BASE_URL ?? 'https://dadesobertes.fgc.cat/api/explore/v2.1',
} as const;

export const runtimeConfig = {
  realtimeCacheTtlMs: 8_000,
  realtimeStaleMaxMs: 30_000,
  serviceAlertsCacheTtlMs: 5 * 60_000,
  serviceAlertsStaleMaxMs: 60 * 60_000,
  upstreamTimeoutMs: 10_000,
} as const;
