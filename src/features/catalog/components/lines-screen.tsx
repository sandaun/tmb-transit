import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Line, TransportMode } from '@/src/domain/catalog/models';
import { useLinesQuery } from '@/src/features/catalog/hooks/use-lines-query';
import { LineRow } from '@/src/features/catalog/components/line-row';
import { useAppLanguage } from '@/src/i18n';
import { useUserPreferencesStore } from '@/src/features/preferences/store';
import {
  filterLinesByFamily,
  listAvailableFamilies,
  BUS_FAMILIES,
  type BusLineFamily,
} from '@/src/features/catalog/utils/bus-line-family';

const TAB_BAR_CLEARANCE = 96;

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function LinesScreen() {
  const { t } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<TransportMode>('metro');
  const [busFamily, setBusFamily] = useState<BusLineFamily | null>(null);
  const [query, setQuery] = useState('');
  const favoriteLines = useUserPreferencesStore((state) => state.favoriteLines);
  const toggleFavoriteLine = useUserPreferencesStore((state) => state.toggleFavoriteLine);

  const { data: lines = [], isLoading, error } = useLinesQuery(mode);

  const availableFamilies = useMemo(
    () => (mode === 'bus' ? listAvailableFamilies(lines) : []),
    [lines, mode],
  );

  const filteredLines = useMemo(() => {
    let next = mode === 'bus' ? filterLinesByFamily(lines, busFamily) : lines;

    if (query.trim()) {
      const needle = normalize(query.trim());
      next = next.filter(
        (line) =>
          normalize(line.code).includes(needle) ||
          normalize(line.name).includes(needle) ||
          normalize(line.originStation ?? '').includes(needle) ||
          normalize(line.destinationStation ?? '').includes(needle),
      );
    }

    return next;
  }, [busFamily, lines, mode, query]);

  const familyDescriptors = BUS_FAMILIES.filter((family) =>
    availableFamilies.includes(family.id),
  );

  function handleLinePress(line: Line) {
    router.push({
      pathname: '/lines/[mode]/[lineCode]',
      params: { mode: line.mode, lineCode: line.code },
    } as never);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('lines_title')}</Text>
        <Text style={styles.subtitle}>{t('lines_subtitle')}</Text>

        <View style={styles.modeRow}>
          {(['metro', 'bus'] as const).map((entry) => {
            const active = mode === entry;
            return (
              <Pressable
                key={entry}
                style={[styles.modeChip, active ? styles.modeChipActive : null]}
                onPress={() => {
                  if (entry === mode) return;
                  setMode(entry);
                  setBusFamily(null);
                  setQuery('');
                }}>
                <Text
                  style={[
                    styles.modeChipText,
                    active ? styles.modeChipTextActive : null,
                  ]}>
                  {entry === 'metro' ? t('metro') : t('bus')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder={mode === 'bus' ? t('lines_search_bus') : t('lines_search')}
          placeholderTextColor="#7A8AA1"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />

        {mode === 'bus' && availableFamilies.length > 0 ? (
          <FlatList
            horizontal
            data={[null, ...familyDescriptors.map((family) => family.id)]}
            keyExtractor={(item) => item ?? 'all'}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.familyRow}
            renderItem={({ item }) => {
              const active = item === busFamily;
              const label =
                item === null
                  ? t('lines_all')
                  : (familyDescriptors.find((family) => family.id === item)?.label ?? item);

              return (
                <Pressable
                  style={[styles.familyChip, active ? styles.familyChipActive : null]}
                  onPress={() => setBusFamily(item)}>
                  <Text
                    style={[
                      styles.familyChipText,
                      active ? styles.familyChipTextActive : null,
                    ]}>
                    {label}
                  </Text>
                </Pressable>
              );
            }}
          />
        ) : null}
      </View>

      {error ? (
        <View style={styles.feedback}>
          <Text style={styles.error}>{t('lines_load_error')}</Text>
        </View>
      ) : null}

      <FlatList
        data={filteredLines}
        keyExtractor={(line) => `${line.mode}:${line.code}`}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + TAB_BAR_CLEARANCE },
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <LineRow
            line={item}
            onPress={handleLinePress}
            isFavorite={favoriteLines.some((favorite) => favorite.mode === item.mode && favorite.lineCode === item.code)}
            onFavoritePress={(line) => toggleFavoriteLine({ mode: line.mode, lineCode: line.code })}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <Text style={styles.empty}>{t('lines_loading')}</Text>
          ) : (
            <Text style={styles.empty}>{t('lines_empty')}</Text>
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
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#F4F7FB',
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0B1220',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: '#4F5D75',
    fontSize: 14,
    marginTop: -4,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  modeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CED4DA',
    backgroundColor: '#FFFFFF',
  },
  modeChipActive: {
    backgroundColor: '#0B1220',
    borderColor: '#0B1220',
  },
  modeChipText: {
    color: '#1D3557',
    fontWeight: '700',
    fontSize: 14,
  },
  modeChipTextActive: {
    color: '#F4F8FF',
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
  familyRow: {
    gap: 6,
    paddingVertical: 2,
  },
  familyChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CED4DA',
    backgroundColor: '#FFFFFF',
  },
  familyChipActive: {
    backgroundColor: '#1D3557',
    borderColor: '#1D3557',
  },
  familyChipText: {
    color: '#1D3557',
    fontWeight: '700',
    fontSize: 13,
  },
  familyChipTextActive: {
    color: '#F4F8FF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  separator: {
    height: 8,
  },
  feedback: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  error: {
    color: '#B00020',
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    color: '#4F5D75',
    paddingTop: 24,
  },
});
