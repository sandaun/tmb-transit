import type { Station } from '@/src/domain/catalog/models';

export function getStationStatusColor(station: Station | undefined): string {
  if (!station?.statusLabel) return '#BFD2F7';
  return station.statusLabel.toLowerCase() === 'operatiu' ? '#86F0B4' : '#FFD38E';
}
