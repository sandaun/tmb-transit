import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { APP_CONFIG } from '@/src/config/app-config';
import type { Station } from '@/src/domain/catalog/models';
import { estimateVehicles } from '@/src/domain/realtime/estimate-vehicles';
import type { Arrival, VehicleEstimate } from '@/src/domain/realtime/models';
import { orderStationsByDirection } from '@/src/domain/realtime/order-stations-by-direction';

interface UseEstimatedVehiclesParams {
  arrivals: Arrival[];
  stations: Station[];
  targetStationCode: string;
}

function interpolateVehicles(
  fromVehicles: VehicleEstimate[],
  toVehicles: VehicleEstimate[],
  t: number,
): VehicleEstimate[] {
  const fromById = new Map(fromVehicles.map((vehicle) => [vehicle.id, vehicle]));

  return toVehicles.map((target) => {
    const previous = fromById.get(target.id);

    if (!previous) {
      return target;
    }

    return {
      ...target,
      etaSec: Math.max(0, Math.round(previous.etaSec + (target.etaSec - previous.etaSec) * t)),
      progress01: previous.progress01 + (target.progress01 - previous.progress01) * t,
      lat: previous.lat + (target.lat - previous.lat) * t,
      lon: previous.lon + (target.lon - previous.lon) * t,
    };
  });
}

export function useEstimatedVehicles({
  arrivals,
  stations,
  targetStationCode,
}: UseEstimatedVehiclesParams) {
  const [simulatedArrivals, setSimulatedArrivals] = useState<Arrival[]>(arrivals);
  const [vehicles, setVehicles] = useState<VehicleEstimate[]>([]);
  const vehiclesRef = useRef<VehicleEstimate[]>([]);

  const stationsByDirection = useMemo(() => orderStationsByDirection(stations), [stations]);

  const getTargetVehicles = useCallback(
    (sourceArrivals: Arrival[]) =>
      estimateVehicles({
        arrivals: sourceArrivals,
        stationsByDirection,
        targetStationCode,
        avgSegmentSec: APP_CONFIG.avgSegmentSec,
        maxVehiclesPerDirection: APP_CONFIG.maxVehiclesPerDirection,
      }),
    [stationsByDirection, targetStationCode],
  );

  useEffect(() => {
    setSimulatedArrivals(arrivals);
  }, [arrivals]);

  useEffect(() => {
    if (!simulatedArrivals.length || !stations.length) {
      setVehicles([]);
      vehiclesRef.current = [];
      return;
    }

    const nextVehicles = getTargetVehicles(simulatedArrivals);
    const currentVehicles = vehiclesRef.current;

    if (!currentVehicles.length) {
      vehiclesRef.current = nextVehicles;
      setVehicles(nextVehicles);
      return;
    }

    const stepMs = 50;
    const totalSteps = Math.max(1, Math.ceil(APP_CONFIG.reconcileDurationMs / stepMs));
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep += 1;
      const t = Math.min(1, currentStep / totalSteps);
      const interpolated = interpolateVehicles(currentVehicles, nextVehicles, t);
      vehiclesRef.current = interpolated;
      setVehicles(interpolated);

      if (t >= 1) {
        clearInterval(timer);
      }
    }, stepMs);

    return () => {
      clearInterval(timer);
    };
  }, [getTargetVehicles, simulatedArrivals, stations.length]);

  useEffect(() => {
    if (!simulatedArrivals.length) {
      return;
    }

    const timer = setInterval(() => {
      setSimulatedArrivals((previous) =>
        previous.map((arrival) => ({
          ...arrival,
          etaSec: Math.max(0, arrival.etaSec - 1),
        })),
      );
    }, APP_CONFIG.vehicleTickMs);

    return () => {
      clearInterval(timer);
    };
  }, [simulatedArrivals.length]);

  return {
    vehicles,
    simulatedArrivals,
  };
}
