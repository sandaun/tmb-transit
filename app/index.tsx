import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { StationScreen } from '@/src/features/station/components/station-screen';
import { useLineStationsQuery } from '@/src/features/catalog/hooks/use-line-stations-query';
import { useMetroLinesQuery } from '@/src/features/catalog/hooks/use-metro-lines-query';
import { useTransitStore } from '@/src/state/store';

function pickDefaultLineCode(lineCodes: string[]): string | null {
  const l3 = lineCodes.find(
    (code) => code.toLowerCase() === 'l3' || code === '3',
  );
  return l3 ?? lineCodes[0] ?? null;
}

export default function IndexRoute() {
  const {
    data: lines = [],
    isLoading: linesLoading,
    error: linesError,
  } = useMetroLinesQuery();
  const selectedLineCode = useTransitStore((state) => state.selectedLineCode);
  const selectedStationCode = useTransitStore((state) => state.selectedStationCode);
  const setSelection = useTransitStore((state) => state.setSelection);

  const lineCode =
    selectedLineCode ?? pickDefaultLineCode(lines.map((line) => line.code));

  const {
    data: stations = [],
    isLoading: stationsLoading,
    error: stationsError,
  } = useLineStationsQuery(lineCode);

  const stationCode =
    (selectedStationCode &&
      stations.some((station) => station.code === selectedStationCode) &&
      selectedStationCode) ||
    stations[0]?.code ||
    null;

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

  return (
    <StationScreen
      lineCode={lineCode}
      stationCode={stationCode}
      showBackButton={false}
      onStationChange={(nextStationCode) => {
        setSelection(lineCode, nextStationCode);
      }}
    />
  );
}

const styles = StyleSheet.create({
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
