import type { Arrival } from '@/src/domain/realtime/models';

export function formatEta(etaSec: number): string {
  const safe = Math.max(0, etaSec);

  if (safe <= 45) return 'Now';
  if (safe >= 5 * 60) return `${Math.floor(safe / 60)} min`;

  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
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
