import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapAdapter } from '@/src/features/station/components/map-adapter';
import { ModeToggle } from '@/src/features/station/components/mode-toggle';
import { FamilyFilter } from '@/src/features/station/components/family-filter';
import { SearchShell } from '@/src/features/station/components/search-shell';
import type { Line, TransportMode } from '@/src/domain/catalog/models';
import {
  filterLinesByFamily,
  listAvailableFamilies,
  type BusLineFamily,
} from '@/src/features/catalog/utils/bus-line-family';
import { useLineStationsQuery } from '@/src/features/catalog/hooks/use-line-stations-query';
import { useLineSegmentsQuery } from '@/src/features/station/hooks/use-line-segments-query';
import type { StationInterchange } from '@/src/features/station/utils/station-interchanges';

interface MapScreenProps {
  lineCode: string;
  lines?: Line[];
  mode: TransportMode;
  stationCode: string;
  showBackButton?: boolean;
  stationInterchanges?: StationInterchange[];
  onLineChange?: (lineCode: string) => void;
  onModeChange?: (mode: TransportMode) => void;
  onStationChange?: (stationCode: string) => void;
}

export function MapScreen({
  lineCode,
  lines,
  mode,
  stationCode,
  showBackButton = true,
  stationInterchanges,
  onLineChange,
  onModeChange,
  onStationChange,
}: MapScreenProps) {
  const insets = useSafeAreaInsets();

  const stationsQuery = useLineStationsQuery(mode, lineCode);
  const segmentsQuery = useLineSegmentsQuery(mode, lineCode);
  const stations = useMemo(() => stationsQuery.data ?? [], [stationsQuery.data]);

  const [busFamily, setBusFamily] = useState<BusLineFamily | null>(null);

  const availableFamilies = useMemo(
    () => (mode === 'bus' ? listAvailableFamilies(lines ?? []) : []),
    [lines, mode],
  );

  const visibleLines = useMemo(() => {
    if (mode !== 'bus' || !lines) {
      return lines ?? [];
    }
    return filterLinesByFamily(lines, busFamily);
  }, [busFamily, lines, mode]);

  const handleStationPress = useCallback(
    (nextStationCode: string) => {
      if (!nextStationCode) return;
      onStationChange?.(nextStationCode);
    },
    [onStationChange],
  );

  const showFamilyFilter = mode === 'bus' && availableFamilies.length > 0;
  const overlayOffsetExtra = (onModeChange ? 56 : 0) + (showFamilyFilter ? 48 : 0);

  return (
    <View style={styles.root}>
      <MapAdapter
        lineCode={lineCode}
        mode={mode}
        stations={stations}
        segments={segmentsQuery.data ?? []}
        selectedStationCode={stationCode}
        stationInterchanges={stationInterchanges}
        isRouteLoading={segmentsQuery.isLoading}
        locationButtonTop={insets.top + 76 + overlayOffsetExtra}
        onStationPress={handleStationPress}
      />

      <View style={[styles.topOverlay, { top: insets.top + 8 }]}>
        {showBackButton ? (
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>{'<'}</Text>
          </Pressable>
        ) : (
          <View style={styles.controls}>
            {onModeChange ? (
              <ModeToggle mode={mode} onChange={onModeChange} />
            ) : null}
            {showFamilyFilter ? (
              <FamilyFilter
                available={availableFamilies}
                selected={busFamily}
                onChange={setBusFamily}
              />
            ) : null}
            <SearchShell
              lineCode={lineCode}
              lines={visibleLines}
              mode={mode}
              onLineChange={onLineChange}
            />
          </View>
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
  controls: {
    gap: 8,
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
