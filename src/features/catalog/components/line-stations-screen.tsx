import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { TransportMode } from '@/src/domain/catalog/models';
import { useLinesQuery } from '@/src/features/catalog/hooks/use-lines-query';
import { useLineStationsQuery } from '@/src/features/catalog/hooks/use-line-stations-query';
import { LineBadge } from '@/src/features/catalog/components/line-badge';
import { useTransitStore } from '@/src/state/store';

interface LineStationsScreenProps {
  mode: TransportMode;
  lineCode: string;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function LineStationsScreen({ mode, lineCode }: LineStationsScreenProps) {
  const insets = useSafeAreaInsets();
  const setSelection = useTransitStore((state) => state.setSelection);
  const [query, setQuery] = useState('');

  const linesQuery = useLinesQuery(mode);
  const line = linesQuery.data?.find((entry) => entry.code === lineCode);

  const { data: stations = [], isLoading, error } = useLineStationsQuery(mode, lineCode);

  const filteredStations = useMemo(() => {
    if (!query.trim()) {
      return stations;
    }
    const needle = normalize(query.trim());
    return stations.filter(
      (station) =>
        normalize(station.name).includes(needle) || station.code.includes(query.trim()),
    );
  }, [query, stations]);

  function handleStationPress(stationCode: string) {
    setSelection(mode, lineCode, stationCode);
    router.dismissAll();
    router.navigate('/' as never);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Tornar">
            <Text style={styles.backButtonText}>{'‹'}</Text>
          </Pressable>
          <View style={styles.titleWrap}>
            <View style={styles.titleRow}>
              <LineBadge
                color={line?.color}
                lineCode={lineCode}
                mode={mode}
                size="medium"
                shape="square"
              />
              <View style={styles.titleTextWrap}>
                {line?.originStation && line?.destinationStation ? (
                  <Text style={styles.title} numberOfLines={2}>
                    {`${line.originStation} ↔ ${line.destinationStation}`}
                  </Text>
                ) : (
                  <Text style={styles.title} numberOfLines={1}>
                    {lineCode}
                  </Text>
                )}
                <Text style={styles.subtitle} numberOfLines={1}>
                  {mode === 'bus' ? 'Línia bus' : 'Línia metro'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Cerca estació"
          placeholderTextColor="#7A8AA1"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
      </View>

      {error ? (
        <Text style={styles.error}>{"No s'han pogut carregar les estacions."}</Text>
      ) : null}

      <FlatList
        data={filteredStations}
        keyExtractor={(station) => station.code}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item, index }) => (
          <Pressable
            style={({ pressed }) => [styles.stationRow, pressed && styles.stationRowPressed]}
            onPress={() => handleStationPress(item.code)}
            accessibilityRole="button"
            accessibilityLabel={`Estació ${item.name}`}
          >
            <View style={styles.indexBubble}>
              <Text style={styles.indexText}>{item.order ?? index + 1}</Text>
            </View>
            <View style={styles.stationTextWrap}>
              <Text style={styles.stationName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.accessibilityLabel || item.statusLabel ? (
                <Text style={styles.stationMeta} numberOfLines={1}>
                  {[item.statusLabel, item.accessibilityLabel].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </View>
            <Text style={styles.chevron}>{'›'}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator color="#0B5FFF" />
              <Text style={styles.emptyText}>Carregant estacions...</Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>No hi ha estacions per mostrar.</Text>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: '#F4F7FB',
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E7EB',
  },
  backButtonText: {
    color: '#0B1220',
    fontSize: 24,
    fontWeight: '700',
    marginTop: -2,
  },
  titleWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0B1220',
    lineHeight: 22,
  },
  subtitle: {
    color: '#4F5D75',
    fontSize: 13,
    marginTop: 2,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#CED4DA',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0B1220',
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  separator: {
    height: 6,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E7EB',
  },
  stationRowPressed: {
    backgroundColor: '#EAF1FF',
    borderColor: '#0B5FFF',
  },
  indexBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    color: '#1D3557',
    fontWeight: '700',
    fontSize: 13,
  },
  stationTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  stationName: {
    color: '#0B1220',
    fontSize: 15,
    fontWeight: '600',
  },
  stationMeta: {
    color: '#7A8AA1',
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    color: '#90A4AE',
    fontSize: 22,
    fontWeight: '500',
  },
  empty: {
    paddingTop: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#4F5D75',
  },
  error: {
    color: '#B00020',
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
