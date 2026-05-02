export const APP_CONFIG = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001',
  useMock: process.env.EXPO_PUBLIC_USE_MOCK === 'true',
  catalogTtlMs: 7 * 24 * 60 * 60 * 1000,
  arrivalsPollIntervalMs: 30_000,
} as const;
