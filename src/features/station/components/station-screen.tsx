import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Arrival } from '@/src/domain/realtime/models';
import { useLineStationsQuery } from '@/src/features/catalog/hooks/use-line-stations-query';
import { MapAdapter } from '@/src/features/station/components/map-adapter';
import { useEstimatedVehicles } from '@/src/features/station/hooks/use-estimated-vehicles';
import { useLineSegmentsQuery } from '@/src/features/station/hooks/use-line-segments-query';
import { useStationArrivalsQuery } from '@/src/features/station/hooks/use-station-arrivals-query';

interface StationScreenProps {
  lineCode: string;
  stationCode: string;
}

interface ArrivalGroup {
  key: string;
  title: string;
  nextArrival: Arrival;
  arrivals: Arrival[];
}

function formatEta(etaSec: number): string {
  const safe = Math.max(0, etaSec);

  if (safe <= 45) {
    return 'Ara';
  }

  if (safe >= 5 * 60) {
    return `${Math.floor(safe / 60)} min`;
  }

  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function groupByDirectionAndPlatform(arrivals: Arrival[]): ArrivalGroup[] {
  const grouped = new Map<string, Arrival[]>();

  for (const arrival of arrivals) {
    const key = `${arrival.directionId}:${arrival.platformCode ?? ''}`;
    const list = grouped.get(key) ?? [];
    list.push(arrival);
    grouped.set(key, list);
  }

  return [...grouped.entries()]
    .map(([key, values]) => {
      const sorted = [...values].sort((a, b) => a.etaSec - b.etaSec);
      const first = sorted[0];
      const title = first.destination
        ? `Direcció ${first.destination}`
        : `Sentit ${first.directionId}`;
      const viaText = first.platformCode ? ` · Via ${first.platformCode}` : '';

      return {
        key,
        title: `${title}${viaText}`,
        nextArrival: first,
        arrivals: sorted.slice(0, 3),
      };
    })
    .sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { numeric: true }),
    );
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
  const targetStation = stations.find(
    (station) => station.code === stationCode,
  );

  const { vehicles, simulatedArrivals } = useEstimatedVehicles({
    arrivals: arrivalsQuery.data ?? [],
    stations,
    targetStationCode: stationCode,
  });

  const groups = useMemo(
    () => groupByDirectionAndPlatform(simulatedArrivals),
    [simulatedArrivals],
  );
  const hasVehicles = vehicles.length > 0;
  const hasArrivals = simulatedArrivals.length > 0;

  const updatedAgoSec = arrivalsQuery.dataUpdatedAt
    ? Math.max(0, Math.floor((now - arrivalsQuery.dataUpdatedAt) / 1_000))
    : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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
        {!hasVehicles ? (
          <Text style={styles.noVehiclesText}>
            {hasArrivals
              ? 'Ara mateix no hi ha cap vehicle estimat visible en el tram anterior de la línia.'
              : 'Sense dades d’arribada encara: quan entrin ETAs, veurem els vehicles estimats al mapa.'}
          </Text>
        ) : (
          <Text style={styles.noVehiclesText}>
            Vehicles estimats visibles al mapa: {vehicles.length}
          </Text>
        )}

        <Text style={styles.estimatedLabel}>
          Estimated position (based on ETA).
        </Text>
        <Text style={styles.helperText}>
          {"ETA és el temps d'arribada estimat del tren a aquesta estació."}
        </Text>

        {updatedAgoSec !== null ? (
          <Text style={styles.updated}>
            Dades API actualitzades fa {updatedAgoSec}s
          </Text>
        ) : null}

        {arrivalsQuery.isError ? (
          <Text style={styles.error}>Error loading arrivals.</Text>
        ) : null}

        {groups.map((group) => (
          <View key={group.key} style={styles.directionCard}>
            <Text style={styles.directionTitle}>{group.title}</Text>
            <Text style={styles.mainEta}>
              Proper tren: {formatEta(group.nextArrival.etaSec)}
            </Text>
            {group.arrivals.length === 0 ? (
              <Text style={styles.empty}>No arrivals</Text>
            ) : (
              group.arrivals.map((arrival) => (
                <View
                  key={`${arrival.directionId}-${arrival.platformCode ?? 'na'}-${arrival.serviceId ?? arrival.destination}`}
                  style={styles.arrivalRow}
                >
                  <Text style={styles.destination}>{arrival.destination}</Text>
                  <Text style={styles.eta}>
                    ETA {formatEta(arrival.etaSec)}
                  </Text>
                </View>
              ))
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  container: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 8,
  },
  backButton: {
    marginTop: 8,
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
  helperText: {
    color: '#4F5D75',
  },
  updated: {
    color: '#4F5D75',
    marginTop: 2,
  },
  noVehiclesText: {
    color: '#4F5D75',
    marginTop: 4,
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
    marginBottom: 6,
  },
  mainEta: {
    color: '#0B5FFF',
    fontWeight: '800',
    fontSize: 22,
    marginBottom: 8,
  },
  empty: {
    color: '#6C757D',
  },
  arrivalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  destination: {
    color: '#1D3557',
    flex: 1,
    paddingRight: 8,
  },
  eta: {
    color: '#0B5FFF',
    fontWeight: '700',
    minWidth: 72,
    textAlign: 'right',
  },
});
