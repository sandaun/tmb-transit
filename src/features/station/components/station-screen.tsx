import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { MapAdapter } from '@/src/features/station/components/map-adapter';
import { useEstimatedVehicles } from '@/src/features/station/hooks/use-estimated-vehicles';
import { useLineSegmentsQuery } from '@/src/features/station/hooks/use-line-segments-query';
import { useLineStationsQuery } from '@/src/features/catalog/hooks/use-line-stations-query';
import { useStationArrivalsQuery } from '@/src/features/station/hooks/use-station-arrivals-query';
import type { Arrival } from '@/src/domain/realtime/models';

interface StationScreenProps {
  lineCode: string;
  stationCode: string;
}

function groupByDirection(arrivals: Arrival[]): Record<string, Arrival[]> {
  const grouped: Record<string, Arrival[]> = {};

  for (const arrival of arrivals) {
    if (!grouped[arrival.directionId]) {
      grouped[arrival.directionId] = [];
    }

    grouped[arrival.directionId].push(arrival);
  }

  for (const directionId of Object.keys(grouped)) {
    grouped[directionId] = grouped[directionId]
      .sort((a, b) => a.etaSec - b.etaSec)
      .slice(0, 3);
  }

  return grouped;
}

export function StationScreen({ lineCode, stationCode }: StationScreenProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => clearInterval(timer);
  }, []);

  const stationsQuery = useLineStationsQuery(lineCode);
  const segmentsQuery = useLineSegmentsQuery(lineCode);
  const arrivalsQuery = useStationArrivalsQuery(lineCode, stationCode);

  const stations = stationsQuery.data ?? [];
  const targetStation = stations.find((station) => station.code === stationCode);

  const { vehicles, simulatedArrivals } = useEstimatedVehicles({
    arrivals: arrivalsQuery.data ?? [],
    stations,
    targetStationCode: stationCode,
  });

  const grouped = useMemo(() => groupByDirection(simulatedArrivals), [simulatedArrivals]);

  const updatedAgoSec = arrivalsQuery.dataUpdatedAt
    ? Math.max(0, Math.floor((now - arrivalsQuery.dataUpdatedAt) / 1_000))
    : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>

      <Text style={styles.title}>{targetStation?.name ?? stationCode}</Text>
      <Text style={styles.subtitle}>Línia {lineCode}</Text>

      <MapAdapter
        stations={stations}
        segments={segmentsQuery.data ?? []}
        targetStationCode={stationCode}
        vehicles={vehicles}
      />

      <Text style={styles.estimatedLabel}>Estimated position (based on ETA).</Text>
      {updatedAgoSec !== null ? <Text style={styles.updated}>Last updated {updatedAgoSec}s ago</Text> : null}

      {arrivalsQuery.isError ? <Text style={styles.error}>Error loading arrivals.</Text> : null}

      {Object.entries(grouped).map(([directionId, arrivals]) => (
        <View key={directionId} style={styles.directionCard}>
          <Text style={styles.directionTitle}>Direction {directionId}</Text>
          {arrivals.length === 0 ? (
            <Text style={styles.empty}>No arrivals</Text>
          ) : (
            arrivals.map((arrival) => (
              <View
                key={`${arrival.directionId}-${arrival.serviceId ?? arrival.destination}`}
                style={styles.arrivalRow}>
                <Text style={styles.destination}>{arrival.destination}</Text>
                <Text style={styles.eta}>{arrival.etaSec}s</Text>
              </View>
            ))
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 28,
    backgroundColor: '#F4F7FB',
    gap: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#D9E2EC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonText: {
    fontWeight: '600',
    color: '#1D3557',
  },
  title: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '700',
    color: '#14213D',
  },
  subtitle: {
    marginBottom: 8,
    color: '#4F5D75',
  },
  estimatedLabel: {
    marginTop: 8,
    fontWeight: '600',
    color: '#1D3557',
  },
  updated: {
    color: '#4F5D75',
  },
  error: {
    color: '#B00020',
    marginTop: 4,
  },
  directionCard: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E7EB',
    padding: 12,
  },
  directionTitle: {
    fontWeight: '700',
    color: '#1D3557',
    marginBottom: 8,
  },
  empty: {
    color: '#6C757D',
  },
  arrivalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  destination: {
    color: '#1D3557',
  },
  eta: {
    color: '#0B5FFF',
    fontWeight: '700',
  },
});
