import type { Station } from '@/src/domain/catalog/models';

function byOrder(stations: Station[]): Station[] {
  if (stations.every((station) => station.order === undefined)) {
    return [...stations];
  }

  return [...stations].sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.name.localeCompare(b.name);
  });
}

export function orderStationsByDirection(stations: Station[]): Record<string, Station[]> {
  const directionOne = byOrder(stations);

  return {
    '1': directionOne,
    '2': [...directionOne].reverse(),
  };
}
