export const APP_CONFIG = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001',
  catalogTtlMs: 7 * 24 * 60 * 60 * 1000,
  arrivalsPollIntervalMs: 12_000,
  avgSegmentSec: 90,
  reconcileDurationMs: 400,
  vehicleTickMs: 1_000,
  maxVehiclesPerDirection: 3,
} as const;
