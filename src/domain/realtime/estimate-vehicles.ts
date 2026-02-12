import type { Station } from '@/src/domain/catalog/models';
import { interpolateOnSegment } from '@/src/domain/geo/interpolate';
import type { Arrival, VehicleEstimate } from '@/src/domain/realtime/models';

interface EstimateVehiclesParams {
  arrivals: Arrival[];
  stationsByDirection: Record<string, Station[]>;
  targetStationCode: string;
  avgSegmentSec: number;
  maxVehiclesPerDirection: number;
}

function groupByDirection(arrivals: Arrival[]): Map<string, Arrival[]> {
  const grouped = new Map<string, Arrival[]>();

  for (const arrival of arrivals) {
    const list = grouped.get(arrival.directionId) ?? [];
    list.push(arrival);
    grouped.set(arrival.directionId, list);
  }

  return grouped;
}

export function estimateVehicles({
  arrivals,
  stationsByDirection,
  targetStationCode,
  avgSegmentSec,
  maxVehiclesPerDirection,
}: EstimateVehiclesParams): VehicleEstimate[] {
  const grouped = groupByDirection(arrivals);
  const vehicles: VehicleEstimate[] = [];

  for (const [directionId, directionArrivals] of grouped.entries()) {
    const orderedStations = stationsByDirection[directionId];
    if (!orderedStations || orderedStations.length < 2) {
      continue;
    }

    const targetStationIndex = orderedStations.findIndex(
      (station) => station.code === targetStationCode,
    );

    if (targetStationIndex <= 0) {
      continue;
    }

    const candidates = [...directionArrivals]
      .sort((a, b) => a.etaSec - b.etaSec)
      .slice(0, maxVehiclesPerDirection);

    for (let index = 0; index < candidates.length; index += 1) {
      const arrival = candidates[index];
      const safeEtaSec = Math.max(0, arrival.etaSec);
      const segmentsBehind = Math.floor(safeEtaSec / avgSegmentSec);
      const progress01 = 1 - ((safeEtaSec % avgSegmentSec) / avgSegmentSec);
      const segmentIndex = targetStationIndex - segmentsBehind - 1;

      if (segmentIndex < 0 || segmentIndex + 1 >= orderedStations.length) {
        continue;
      }

      const fromStation = orderedStations[segmentIndex];
      const toStation = orderedStations[segmentIndex + 1];
      const point = interpolateOnSegment(fromStation, toStation, progress01);

      vehicles.push({
        id: arrival.serviceId ?? `${directionId}-${index}`,
        directionId,
        etaSec: safeEtaSec,
        segmentIndex,
        progress01,
        lat: point.lat,
        lon: point.lon,
        isEstimated: true,
      });
    }
  }

  return vehicles;
}
