import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { useMetroLinesQuery } from '@/src/features/catalog/hooks/use-metro-lines-query';
import { useLineStationsQuery } from '@/src/features/catalog/hooks/use-line-stations-query';
import { useTransitStore } from '@/src/state/store';

function pickDefaultLineCode(lineCodes: string[]): string | null {
  const l3 = lineCodes.find((code) => code.toLowerCase() === 'l3' || code === '3');
  return l3 ?? lineCodes[0] ?? null;
}

export function HomeScreen() {
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
              <Text style={[styles.lineChipText, selected ? styles.lineChipTextSelected : null]}>
                {line.name || line.code}
              </Text>
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
        <Text style={styles.openButtonText}>Obrir estació</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
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
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CED4DA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  lineChipSelected: {
    backgroundColor: '#0B5FFF',
    borderColor: '#0B5FFF',
  },
  lineChipText: {
    fontWeight: '600',
    color: '#1D3557',
  },
  lineChipTextSelected: {
    color: '#FFFFFF',
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
    marginVertical: 12,
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
