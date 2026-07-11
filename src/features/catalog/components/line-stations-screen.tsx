import { useMemo, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
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
import { useAppLanguage } from '@/src/i18n';
import { useUserPreferencesStore } from '@/src/features/preferences/store';
import { Text, type Palette, usePalette, useThemedStyles } from '@/src/design-system';

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
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);
  const { t } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const setSelection = useTransitStore((state) => state.setSelection);
  const [query, setQuery] = useState('');
  const addRecentItem = useUserPreferencesStore((state) => state.addRecentItem);
  const favoriteStops = useUserPreferencesStore((state) => state.favoriteStops);
  const toggleFavoriteStop = useUserPreferencesStore((state) => state.toggleFavoriteStop);

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
  const favoriteStationCodes = useMemo(
    () => new Set(
      favoriteStops
        .filter((stop) => stop.mode === mode && stop.lineCode === lineCode)
        .map((stop) => stop.stationCode),
    ),
    [favoriteStops, lineCode, mode],
  );

  function handleStationPress(stationCode: string) {
    const station = stations.find((item) => item.code === stationCode);
    if (station) {
      addRecentItem({
        kind: 'station',
        mode,
        lineCode,
        stationCode,
        stationName: station.name,
        visitedAtMs: Date.now(),
      });
    }
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
            accessibilityLabel={t('back')}>
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
                <Text
                  style={[
                    styles.subtitle,
                    line?.serviceStatus === 'no-service' && styles.subtitleNoService,
                  ]}
                  numberOfLines={1}
                >
                  {line?.serviceStatus === 'no-service'
                    ? `${t(mode)} · ${t('line_no_service_today')}`
                    : t(mode)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder={t('station_search')}
          placeholderTextColor={palette.textSubtle}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
      </View>

      {error ? (
        <Text style={styles.error}>{t('stations_load_error')}</Text>
      ) : null}

      <FlatList
        data={filteredStations}
        keyExtractor={(station) => station.code}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item, index }) => {
          const isFavorite = favoriteStationCodes.has(item.code);
          return (
            <View style={styles.stationRow}>
              <Pressable
                style={({ pressed }) => [styles.stationRowContent, pressed && styles.stationRowPressed]}
                onPress={() => handleStationPress(item.code)}
                accessibilityRole="button"
                accessibilityLabel={`${t('saved_station')} ${item.name}`}
              >
                <View style={styles.indexBubble}>
                  <Text style={styles.indexText}>{item.order ?? index + 1}</Text>
                </View>
                <View style={styles.stationTextWrap}>
                  <Text style={styles.stationName} numberOfLines={1}>{item.name}</Text>
                  {item.accessibilityLabel || item.statusLabel ? (
                    <Text style={styles.stationMeta} numberOfLines={1}>
                      {[item.statusLabel, item.accessibilityLabel].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.chevron}>{'›'}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(isFavorite ? 'station_unfavorite' : 'station_favorite')}
                style={styles.favoriteButton}
                onPress={() => toggleFavoriteStop({
                  mode,
                  lineCode,
                  stationCode: item.code,
                  stationName: item.name,
                })}
              >
                <MaterialIcons
                  name={isFavorite ? 'star' : 'star-border'}
                  size={22}
                  color={isFavorite ? palette.favorite : palette.textMuted}
                />
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={palette.accent} />
              <Text style={styles.emptyText}>{t('stations_loading')}</Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>{t('stations_empty')}</Text>
          )
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (palette: Palette) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: palette.background,
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
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  backButtonText: {
    color: palette.text,
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
    color: palette.text,
    lineHeight: 22,
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  subtitleNoService: {
    color: palette.warning,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: palette.borderStrong,
    backgroundColor: palette.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.text,
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
    overflow: 'hidden',
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  stationRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingLeft: 14,
  },
  stationRowPressed: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accent,
  },
  indexBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 13,
  },
  stationTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  stationName: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
  stationMeta: {
    color: palette.textSubtle,
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    color: palette.textSubtle,
    fontSize: 22,
    fontWeight: '500',
  },
  favoriteButton: {
    alignSelf: 'stretch',
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    paddingTop: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: palette.textMuted,
  },
  error: {
    color: palette.danger,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
