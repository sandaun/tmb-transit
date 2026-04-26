import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MetroLineBadge } from '@/src/features/catalog/components/metro-line-badge';
import { useMetroLinesQuery } from '@/src/features/catalog/hooks/use-metro-lines-query';
import { useLineStationsQuery } from '@/src/features/catalog/hooks/use-line-stations-query';
import { useTransitStore } from '@/src/state/store';

const TAB_BAR_CLEARANCE = 72;

function pickDefaultLineCode(lineCodes: string[]): string | null {
  const l3 = lineCodes.find((code) => code.toLowerCase() === 'l3' || code === '3');
  return l3 ?? lineCodes[0] ?? null;
}

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { data: lines = [], isLoading: linesLoading, error: linesError } = useMetroLinesQuery();
  const [query, setQuery] = useState('');

  const selectedLineCode = useTransitStore((state) => state.selectedLineCode);
  const selectedStationCode = useTransitStore((state) => state.selectedStationCode);
  const setSelection = useTransitStore((state) => state.setSelection);

  useEffect(() => {
    if (!lines.length || selectedLineCode) {
      return;
    }

    const defaultLineCode = pickDefaultLineCode(lines.map((line) => line.code));
    if (!defaultLineCode) {
      return;
    }

    setSelection(defaultLineCode, selectedStationCode ?? '');
  }, [lines, selectedLineCode, selectedStationCode, setSelection]);

  const lineCode = selectedLineCode && selectedLineCode.length > 0 ? selectedLineCode : null;
  const {
    data: stations = [],
    isLoading: stationsLoading,
    error: stationsError,
  } = useLineStationsQuery(lineCode);

  const filteredStations = useMemo(() => {
    if (!query.trim()) {
      return stations;
    }

    const normalized = query.trim().toLowerCase();
    return stations.filter((station) => station.name.toLowerCase().includes(normalized));
  }, [query, stations]);

  const canNavigate = Boolean(lineCode && selectedStationCode);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>TMB Transit MVP</Text>
        <Text style={styles.subtitle}>Selecciona línia i estació (L3 per defecte)</Text>

        <Text style={styles.sectionTitle}>Línies metro</Text>
        <View style={styles.lineList}>
          {lines.map((line) => {
            const selected = line.code === lineCode;

            return (
              <Pressable
                key={line.code}
                style={[styles.lineChip, selected ? styles.lineChipSelected : null]}
                onPress={() => setSelection(line.code, '')}>
                <MetroLineBadge color={line.color} lineCode={line.code} size="small" />
              </Pressable>
            );
          })}
        </View>

        {linesLoading ? <Text style={styles.meta}>Carregant línies...</Text> : null}
        {linesError ? <Text style={styles.error}>Error carregant línies.</Text> : null}

        <Text style={styles.sectionTitle}>Estacions</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca estació"
          value={query}
          onChangeText={setQuery}
        />

        {stationsLoading ? <Text style={styles.meta}>Carregant estacions...</Text> : null}
        {stationsError ? <Text style={styles.error}>Error carregant estacions.</Text> : null}

        <FlatList
          data={filteredStations}
          keyExtractor={(item) => item.code}
          style={styles.stationList}
          renderItem={({ item }) => {
            const selected = item.code === selectedStationCode;

            return (
              <Pressable
                style={[styles.stationItem, selected ? styles.stationItemSelected : null]}
                onPress={() => setSelection(lineCode ?? item.lineCode, item.code)}>
                <Text style={styles.stationName}>{item.name}</Text>
                <Text style={styles.stationMeta}>{item.code}</Text>
              </Pressable>
            );
          }}
        />

        <View style={[styles.footer, { paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }]}>
          <Pressable
            style={[styles.openButton, !canNavigate ? styles.openButtonDisabled : null]}
            disabled={!canNavigate}
            onPress={() => {
              if (!lineCode || !selectedStationCode) {
                return;
              }

              router.push({
                pathname: `/station/${lineCode}/${selectedStationCode}` as never,
              });
            }}>
            <Text style={styles.openButtonText}>Veure estació al mapa</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#F4F7FB',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#14213D',
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 16,
    color: '#4F5D75',
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#1D3557',
  },
  lineList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  lineChip: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CED4DA',
    padding: 4,
    backgroundColor: '#FFFFFF',
  },
  lineChipSelected: {
    borderColor: '#14213D',
  },
  meta: {
    marginTop: 8,
    color: '#4F5D75',
  },
  error: {
    marginTop: 8,
    color: '#B00020',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#CED4DA',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  stationList: {
    marginTop: 10,
    flex: 1,
  },
  footer: {
    backgroundColor: '#F4F7FB',
    borderTopColor: '#E4E7EB',
    borderTopWidth: 1,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  stationItem: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E4E7EB',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  stationItemSelected: {
    borderColor: '#0B5FFF',
    backgroundColor: '#EAF1FF',
  },
  stationName: {
    fontWeight: '600',
    color: '#1D3557',
  },
  stationMeta: {
    color: '#4F5D75',
    marginTop: 2,
  },
  openButton: {
    borderRadius: 12,
    backgroundColor: '#0B5FFF',
    alignItems: 'center',
    paddingVertical: 14,
  },
  openButtonDisabled: {
    backgroundColor: '#90A4AE',
  },
  openButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
