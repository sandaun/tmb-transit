import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAllLineStationsQuery } from '@/src/features/catalog/hooks/use-all-line-stations-query';
import { useLineStationsQuery } from '@/src/features/catalog/hooks/use-line-stations-query';
import { useMetroLinesQuery } from '@/src/features/catalog/hooks/use-metro-lines-query';
import {
  LocalBottomSheet,
  type LocalBottomSheetHandle,
} from '@/src/features/station/components/bottom-sheet/local-bottom-sheet';
import { MapScreen } from '@/src/features/station/components/map-screen';
import { StationContent } from '@/src/features/station/components/station-content';
import { buildStationInterchanges } from '@/src/features/station/utils/station-interchanges';
import { useTransitStore } from '@/src/state/store';

function pickDefaultLineCode(lineCodes: string[]): string | null {
  const l3 = lineCodes.find(
    (code) => code.toLowerCase() === 'l3' || code === '3',
  );
  return l3 ?? lineCodes[0] ?? null;
}

export default function MapTabScreen() {
  const {
    data: lines = [],
    isLoading: linesLoading,
    error: linesError,
  } = useMetroLinesQuery();

  const selectedLineCode = useTransitStore((s) => s.selectedLineCode);
  const selectedStationCode = useTransitStore((s) => s.selectedStationCode);
  const setSelection = useTransitStore((s) => s.setSelection);

  const lineCode =
    selectedLineCode ?? pickDefaultLineCode(lines.map((l) => l.code));

  const {
    data: stations = [],
    isLoading: stationsLoading,
    error: stationsError,
  } = useLineStationsQuery(lineCode);
  const allStationsQuery = useAllLineStationsQuery(lines);
  const stationInterchanges = useMemo(
    () => buildStationInterchanges(lines, allStationsQuery.stationsByLine),
    [allStationsQuery.stationsByLine, lines],
  );

  const stationCode =
    (selectedStationCode &&
      stations.some((s) => s.code === selectedStationCode) &&
      selectedStationCode) ||
    stations[0]?.code ||
    null;

  const sheetRef = useRef<LocalBottomSheetHandle>(null);
  const [detentIndex, setDetentIndex] = useState(0);

  useEffect(() => {
    if (!lineCode || !stationCode) {
      return;
    }

    if (selectedLineCode === lineCode && selectedStationCode === stationCode) {
      return;
    }

    setSelection(lineCode, stationCode);
  }, [lineCode, selectedLineCode, selectedStationCode, setSelection, stationCode]);

  const handleDetentChange = useCallback((nextDetentIndex: number) => {
    setDetentIndex(nextDetentIndex);
  }, []);

  const handleLineChange = useCallback(
    (nextLineCode: string) => {
      setSelection(nextLineCode, '');
      sheetRef.current?.resize(0);
    },
    [setSelection],
  );

  const handleStationChange = useCallback(
    (nextStationCode: string) => {
      if (!lineCode) return;
      setSelection(lineCode, nextStationCode);
      sheetRef.current?.resize(1);
    },
    [lineCode, setSelection],
  );
  const handleLineStationSelect = useCallback(
    (nextLineCode: string, nextStationCode: string) => {
      setSelection(nextLineCode, nextStationCode);
      sheetRef.current?.resize(1);
    },
    [setSelection],
  );

  if (linesError || stationsError) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>Map data could not be loaded.</Text>
        <Text style={styles.fallbackText}>
          Check the API connection and try again.
        </Text>
      </View>
    );
  }

  if (linesLoading || stationsLoading || !lineCode || !stationCode) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2A70FF" />
        <Text style={styles.loadingText}>Preparing live map...</Text>
      </View>
    );
  }

  const isCollapsed = detentIndex === 0;

  return (
    <View style={styles.root}>
      <MapScreen
        lineCode={lineCode}
        lines={lines}
        stationCode={stationCode}
        showBackButton={false}
        stationInterchanges={stationInterchanges}
        onLineChange={handleLineChange}
        onStationChange={handleStationChange}
      />

      <LocalBottomSheet
        ref={sheetRef}
        detents={[0.1, 0.5, 1]}
        initialDetentIndex={0}
        onDetentChange={handleDetentChange}
      >
        <View
          style={isCollapsed ? styles.contentHidden : styles.contentVisible}
          pointerEvents={isCollapsed ? 'none' : 'auto'}
        >
          <StationContent
            lines={lines}
            stationInterchanges={stationInterchanges}
            onLineStationSelect={handleLineStationSelect}
          />
        </View>
      </LocalBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#09111E',
  },
  contentVisible: {
    flex: 1,
  },
  contentHidden: {
    flex: 0,
    height: 0,
    opacity: 0,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#09111E',
    gap: 12,
  },
  loadingText: {
    color: '#D7E5FF',
    fontSize: 16,
    fontWeight: '600',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#09111E',
    paddingHorizontal: 24,
    gap: 8,
  },
  fallbackTitle: {
    color: '#F4F8FF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  fallbackText: {
    color: '#AABBDC',
    fontSize: 15,
    textAlign: 'center',
  },
});
