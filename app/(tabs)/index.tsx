import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Line, TransportMode } from '@/src/domain/catalog/models';
import { useAllLineStationsQuery } from '@/src/features/catalog/hooks/use-all-line-stations-query';
import { useLineStationsQuery } from '@/src/features/catalog/hooks/use-line-stations-query';
import { useLinesQuery } from '@/src/features/catalog/hooks/use-lines-query';
import {
  LocalBottomSheet,
  type LocalBottomSheetHandle,
} from '@/src/features/station/components/bottom-sheet/local-bottom-sheet';
import { MapScreen } from '@/src/features/station/components/map-screen';
import { StationContent } from '@/src/features/station/components/station-content';
import { buildStationInterchanges } from '@/src/features/station/utils/station-interchanges';
import { useTransitStore } from '@/src/state/store';

function pickDefaultLineCode(mode: TransportMode, lines: Line[]): string | null {
  if (!lines.length) {
    return null;
  }

  if (mode === 'metro') {
    const l3 = lines.find(
      (line) => line.code.toLowerCase() === 'l3' || line.code === '3',
    );
    return (l3 ?? lines[0]).code;
  }

  return lines[0].code;
}

const SHEET_DETENTS = [0.1, 0.5, 1] as const;

export default function MapTabScreen() {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const mode = useTransitStore((s) => s.selectedMode);
  const selectedLineCode = useTransitStore((s) => s.selectedLineCode);
  const selectedStationCode = useTransitStore((s) => s.selectedStationCode);
  const setSelection = useTransitStore((s) => s.setSelection);

  const {
    data: lines = [],
    isLoading: linesLoading,
    error: linesError,
  } = useLinesQuery(mode);

  const lineCode =
    (selectedLineCode && lines.some((line) => line.code === selectedLineCode) && selectedLineCode) ||
    pickDefaultLineCode(mode, lines);

  const {
    data: stations = [],
    isLoading: stationsLoading,
    error: stationsError,
  } = useLineStationsQuery(mode, lineCode);
  const interchangeLines = mode === 'metro' ? lines : [];
  const allStationsQuery = useAllLineStationsQuery(interchangeLines);
  const stationInterchanges = useMemo(
    () => buildStationInterchanges(interchangeLines, allStationsQuery.stationsByLine),
    [allStationsQuery.stationsByLine, interchangeLines],
  );

  const stationCode =
    (selectedStationCode &&
      stations.some((s) => s.code === selectedStationCode) &&
      selectedStationCode) ||
    stations[0]?.code ||
    null;

  const sheetRef = useRef<LocalBottomSheetHandle>(null);
  const [detentIndex, setDetentIndex] = useState(0);

  const sheetHeight = useMemo(() => {
    const usableHeight = Math.max(0, windowHeight - Math.max(insets.top, 48));
    const detent = SHEET_DETENTS[detentIndex] ?? SHEET_DETENTS[0];
    return Math.round(usableHeight * detent);
  }, [detentIndex, insets.top, windowHeight]);

  useEffect(() => {
    if (!lineCode || !stationCode) {
      return;
    }

    if (
      selectedLineCode === lineCode &&
      selectedStationCode === stationCode
    ) {
      return;
    }

    setSelection(mode, lineCode, stationCode);
  }, [
    lineCode,
    mode,
    selectedLineCode,
    selectedStationCode,
    setSelection,
    stationCode,
  ]);

  const handleDetentChange = useCallback((nextDetentIndex: number) => {
    setDetentIndex(nextDetentIndex);
  }, []);

  const handleModeChange = useCallback(
    (nextMode: TransportMode) => {
      if (nextMode === mode) return;
      setSelection(nextMode, '', '');
      sheetRef.current?.resize(0);
    },
    [mode, setSelection],
  );

  const handleLineChange = useCallback(
    (nextLineCode: string) => {
      const nextLine = lines.find((line) => line.code === nextLineCode);
      setSelection(nextLine?.mode ?? mode, nextLineCode, '');
      sheetRef.current?.resize(0);
    },
    [lines, mode, setSelection],
  );

  const handleStationChange = useCallback(
    (nextStationCode: string) => {
      if (!lineCode) return;
      setSelection(mode, lineCode, nextStationCode);
      sheetRef.current?.resize(1);
    },
    [lineCode, mode, setSelection],
  );
  const handleLineStationSelect = useCallback(
    (nextMode: TransportMode, nextLineCode: string, nextStationCode: string) => {
      setSelection(nextMode, nextLineCode, nextStationCode);
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
        mode={mode}
        stationCode={stationCode}
        showBackButton={false}
        stationInterchanges={stationInterchanges}
        bottomInset={sheetHeight}
        onLineChange={handleLineChange}
        onModeChange={handleModeChange}
        onStationChange={handleStationChange}
      />

      <LocalBottomSheet
        ref={sheetRef}
        detents={SHEET_DETENTS}
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
