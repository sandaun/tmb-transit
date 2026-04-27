import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapAdapter } from '@/src/features/station/components/map-adapter';
import { SearchShell } from '@/src/features/station/components/search-shell';
import type { Line } from '@/src/domain/catalog/models';
import { useLineStationsQuery } from '@/src/features/catalog/hooks/use-line-stations-query';
import { useLineSegmentsQuery } from '@/src/features/station/hooks/use-line-segments-query';
import { useStationArrivalsQuery } from '@/src/features/station/hooks/use-station-arrivals-query';
import { useEstimatedVehicles } from '@/src/features/station/hooks/use-estimated-vehicles';
import type { Arrival } from '@/src/domain/realtime/models';

const EMPTY_ARRIVALS: Arrival[] = [];

interface MapScreenProps {
  lineCode: string;
  lines?: Line[];
  stationCode: string;
  showBackButton?: boolean;
  onLineChange?: (lineCode: string) => void;
  onStationChange?: (stationCode: string) => void;
}

export function MapScreen({
  lineCode,
  lines,
  stationCode,
  showBackButton = true,
  onLineChange,
  onStationChange,
}: MapScreenProps) {
  const insets = useSafeAreaInsets();

  const stationsQuery = useLineStationsQuery(lineCode);
  const segmentsQuery = useLineSegmentsQuery(lineCode);
  const stations = useMemo(() => stationsQuery.data ?? [], [stationsQuery.data]);

  const arrivalsQuery = useStationArrivalsQuery(lineCode || null, stationCode || null);
  const arrivals = useMemo(() => arrivalsQuery.data ?? EMPTY_ARRIVALS, [arrivalsQuery.data]);

  const { vehicles } = useEstimatedVehicles({
    arrivals,
    stations,
    targetStationCode: stationCode,
  });

  const handleStationPress = useCallback(
    (nextStationCode: string) => {
      if (!nextStationCode) return;
      onStationChange?.(nextStationCode);
    },
    [onStationChange],
  );

  return (
    <View style={styles.root}>
      <MapAdapter
        lineCode={lineCode}
        stations={stations}
        segments={segmentsQuery.data ?? []}
        selectedStationCode={stationCode}
        vehicles={vehicles}
        onStationPress={handleStationPress}
      />

      <View style={[styles.topOverlay, { top: insets.top + 8 }]}>
        {showBackButton ? (
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>{'<'}</Text>
          </Pressable>
        ) : (
          <SearchShell
            lineCode={lineCode}
            lines={lines}
            onLineChange={onLineChange}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#09111E',
  },
  topOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 19, 36, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButtonText: {
    color: '#F0F5FF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: -1,
  },
});
