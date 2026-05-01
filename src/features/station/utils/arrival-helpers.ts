import type { Arrival } from '@/src/domain/realtime/models';

export function formatEta(etaSec: number): string {
  const safe = Math.max(0, etaSec);

  if (safe <= 45) return 'Now';
  if (safe >= 5 * 60) return `${Math.floor(safe / 60)} min`;

  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function getLiveEtaSec(arrival: Arrival, nowMs: number): number {
  const elapsedSec = Math.max(
    0,
    Math.floor((nowMs - arrival.sourceTimestampMs) / 1_000),
  );

  return Math.max(0, arrival.etaSec - elapsedSec);
}

export function sortArrivalsByEta(arrivals: Arrival[]): Arrival[] {
  return [...arrivals].sort((a, b) => a.etaSec - b.etaSec);
}

export function makeArrivalKey(arrival: Arrival, index: number): string {
  return [
    arrival.directionId,
    arrival.platformCode ?? 'na',
    arrival.serviceId ?? arrival.destination,
    String(index),
  ].join(':');
}
