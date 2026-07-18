import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppLanguage, RecentItem, SavedPlaceId, ThemePreference } from '@/src/features/preferences/models';
import type { TransportMode } from '@/src/domain/catalog/models';
import { useUserPreferencesStore } from '@/src/features/preferences/store';
import { useTransitStore } from '@/src/state/store';
import { useAppLanguage } from '@/src/i18n';
import { useLinesQuery } from '@/src/features/catalog/hooks/use-lines-query';
import { LineBadge } from '@/src/features/catalog/components/line-badge';
import { Text, type Palette, usePalette, useThemedStyles } from '@/src/design-system';

const TAB_BAR_CLEARANCE = 96;
const LANGUAGES: AppLanguage[] = ['ca', 'en', 'es'];
const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

function placeIcon(id: SavedPlaceId): 'home' | 'business' {
  return id === 'home' ? 'home' : 'business';
}

export default function YouTabScreen() {
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { language, t } = useAppLanguage();
  const savedPlaces = useUserPreferencesStore((state) => state.savedPlaces);
  const favoriteLines = useUserPreferencesStore((state) => state.favoriteLines);
  const favoriteStops = useUserPreferencesStore((state) => state.favoriteStops);
  const recentItems = useUserPreferencesStore((state) => state.recentItems);
  const setLanguage = useUserPreferencesStore((state) => state.setLanguage);
  const theme = useUserPreferencesStore((state) => state.theme);
  const setTheme = useUserPreferencesStore((state) => state.setTheme);
  const removeSavedPlace = useUserPreferencesStore((state) => state.removeSavedPlace);
  const clearSavedData = useUserPreferencesStore((state) => state.clearSavedData);
  const setSelection = useTransitStore((state) => state.setSelection);
  const metroLinesQuery = useLinesQuery('metro');
  const busLinesQuery = useLinesQuery('bus');
  const fgcLinesQuery = useLinesQuery('fgc');
  const tramLinesQuery = useLinesQuery('tram');
  const favoriteLineDetails = [
    ...(metroLinesQuery.data ?? []),
    ...(busLinesQuery.data ?? []),
    ...(fgcLinesQuery.data ?? []),
    ...(tramLinesQuery.data ?? []),
  ];
  const [preferencesVisible, setPreferencesVisible] = useState(false);
  const visibleRecentItems = recentItems.slice(0, 3);

  const openPlaceEditor = (id: SavedPlaceId) => {
    router.navigate({ pathname: '/', params: { savePlace: id } } as never);
  };

  const planFromPlace = (id: SavedPlaceId) => {
    router.navigate({ pathname: '/', params: { planFrom: id } } as never);
  };

  const openFavoriteStop = (mode: TransportMode, lineCode: string, stationCode: string) => {
    setSelection(mode, lineCode, stationCode);
    router.navigate('/');
  };

  const openRecent = (item: RecentItem) => {
    if (item.kind === 'station') {
      openFavoriteStop(item.mode, item.lineCode, item.stationCode);
      return;
    }

    router.navigate({
      pathname: '/',
      params: {
        originLat: String(item.origin.lat),
        originLon: String(item.origin.lon),
        originLabel: item.origin.label,
      },
    } as never);
  };

  const confirmClear = () => {
    Alert.alert(t('saved_clear_data_title'), t('saved_clear_data_body'), [
      { text: t('saved_cancel'), style: 'cancel' },
      { text: t('saved_delete'), style: 'destructive', onPress: clearSavedData },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('saved_title')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('saved_preferences')}
            style={styles.settingsButton}
            onPress={() => setPreferencesVisible(true)}
          >
            <MaterialIcons name="settings" size={22} color={palette.text} />
          </Pressable>
        </View>
        <Text style={styles.subtitle}>{t('saved_subtitle')}</Text>

        <SectionTitle title={t('saved_places')} />
        <View style={styles.placeGrid}>
          {(['home', 'work'] as const).map((id) => {
            const place = savedPlaces[id];
            const placeName = id === 'home' ? t('saved_home') : t('saved_work');
            return (
              <View key={id} style={styles.placeCard}>
                <View style={styles.placeHeading}>
                  <MaterialIcons name={placeIcon(id)} size={20} color={palette.accent} />
                  <Text style={styles.placeName}>{placeName}</Text>
                  {place ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${t('saved_remove')} ${placeName}`}
                      hitSlop={8}
                      onPress={() => removeSavedPlace(id)}
                    >
                      <MaterialIcons name="close" size={18} color={palette.textMuted} />
                    </Pressable>
                  ) : null}
                </View>
                <Text numberOfLines={2} style={styles.placeLabel}>
                  {place?.label ?? t('saved_set_place')}
                </Text>
                {place ? (
                  <View style={styles.placeActions}>
                    <Pressable accessibilityRole="button" onPress={() => planFromPlace(id)}>
                      <Text style={styles.placeAction}>{t('saved_plan_from')}</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={() => openPlaceEditor(id)}>
                      <Text style={styles.placeAction}>{t('saved_edit_place')}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable accessibilityRole="button" onPress={() => openPlaceEditor(id)}>
                    <Text style={styles.placeAction}>{t('saved_set_place')}</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        <SectionTitle title={t('saved_favorite_stops')} />
        {favoriteStops.length ? (
          <View style={styles.cardList}>
            {favoriteStops.map((stop) => (
              <Pressable
                key={`${stop.mode}:${stop.lineCode}:${stop.stationCode}`}
                accessibilityRole="button"
                accessibilityLabel={stop.stationName}
                style={styles.listCard}
                onPress={() => openFavoriteStop(stop.mode, stop.lineCode, stop.stationCode)}
              >
                <MaterialIcons name="place" size={20} color={palette.accent} />
                <View style={styles.listText}>
                  <Text style={styles.listTitle}>{stop.stationName}</Text>
                  <Text style={styles.listMeta}>{stop.lineCode} · {t(stop.mode)}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={palette.textSubtle} />
              </Pressable>
            ))}
          </View>
        ) : <EmptyText text={t('saved_empty_favorites')} />}

        <SectionTitle title={t('saved_favorite_lines')} />
        {favoriteLines.length ? (
          <View style={styles.cardList}>
            {favoriteLines.map((line) => (
              <Pressable
                key={`${line.mode}:${line.lineCode}`}
                accessibilityRole="button"
                accessibilityLabel={t('line_accessibility', { code: line.lineCode })}
                style={styles.listCard}
                onPress={() => {
                  setSelection(line.mode, line.lineCode, '');
                  router.navigate('/');
                }}
              >
                {(() => {
                  const detail = favoriteLineDetails.find(
                    (candidate) => candidate.mode === line.mode && candidate.code === line.lineCode,
                  );
                  const routeLabel = detail?.originStation && detail.destinationStation
                    ? `${detail.originStation} ↔ ${detail.destinationStation}`
                    : detail?.name ?? line.lineCode;
                  return (
                    <>
                      <LineBadge
                        color={detail?.color}
                        lineCode={line.lineCode}
                        mode={line.mode}
                        size="medium"
                        shape="square"
                      />
                      <View style={styles.listText}>
                        <Text style={styles.listTitle}>{routeLabel}</Text>
                        <Text style={styles.listMeta}>
                          {t(line.mode)} · {line.lineCode}
                        </Text>
                      </View>
                    </>
                  );
                })()}
                <MaterialIcons name="chevron-right" size={22} color={palette.textSubtle} />
              </Pressable>
            ))}
          </View>
        ) : <EmptyText text={t('saved_empty_favorites')} />}

        <SectionTitle title={t('saved_recent')} />
        {visibleRecentItems.length ? (
          <View style={styles.cardList}>
            {visibleRecentItems.map((item) => (
              <Pressable
                key={item.kind === 'station'
                  ? `station:${item.mode}:${item.lineCode}:${item.stationCode}`
                  : `route:${item.origin.lat}:${item.origin.lon}:${item.destination.lat}:${item.destination.lon}`}
                accessibilityRole="button"
                style={styles.listCard}
                onPress={() => openRecent(item)}
              >
                <MaterialIcons name={item.kind === 'station' ? 'place' : 'directions'} size={20} color={palette.accent} />
                <View style={styles.listText}>
                  <Text numberOfLines={1} style={styles.listTitle}>
                    {item.kind === 'station' ? item.stationName : `${item.origin.label} → ${item.destination.label}`}
                  </Text>
                  <Text style={styles.listMeta}>{item.kind === 'station' ? t('saved_station') : t('saved_route')}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={palette.textSubtle} />
              </Pressable>
            ))}
          </View>
        ) : <EmptyText text={t('saved_empty_recent')} />}

      </ScrollView>

      <Modal
        animationType="slide"
        presentationStyle="pageSheet"
        visible={preferencesVisible}
        onRequestClose={() => setPreferencesVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('saved_preferences')}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('saved_cancel')}
              style={styles.settingsButton}
              onPress={() => setPreferencesVisible(false)}
            >
              <MaterialIcons name="close" size={22} color={palette.text} />
            </Pressable>
          </View>
          <View style={styles.preferencesCard}>
            <Text style={styles.preferenceLabel}>{t('saved_language')}</Text>
            <View style={styles.languageRow}>
              {LANGUAGES.map((entry) => (
                <Pressable
                  key={entry}
                  accessibilityRole="button"
                  accessibilityState={{ selected: language === entry }}
                  style={[styles.languageButton, language === entry ? styles.languageButtonActive : null]}
                  onPress={() => setLanguage(entry)}
                >
                  <Text style={[styles.languageText, language === entry ? styles.languageTextActive : null]}>
                    {t(`language_${entry}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.preferenceLabel}>{t('saved_theme')}</Text>
            <View style={styles.languageRow}>
              {THEMES.map((entry) => (
                <Pressable
                  key={entry}
                  accessibilityRole="button"
                  accessibilityState={{ selected: theme === entry }}
                  style={[styles.languageButton, theme === entry ? styles.languageButtonActive : null]}
                  onPress={() => setTheme(entry)}
                >
                  <Text style={[styles.languageText, theme === entry ? styles.languageTextActive : null]}>
                    {t(`theme_${entry}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.preferenceLabel}>{t('saved_data_sources')}</Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={t('saved_powered_by_tram')}
              style={styles.dataSourceButton}
              onPress={() => void Linking.openURL('https://www.tram.cat')}
            >
              <View style={styles.dataSourceBrand}>
                <Text style={styles.dataSourceText}>Powered by</Text>
                <Image
                  accessibilityIgnoresInvertColors
                  contentFit="contain"
                  source={require('@/assets/transport/tram.png')}
                  style={styles.tramLogo}
                />
              </View>
              <MaterialIcons name="open-in-new" size={18} color={palette.accent} />
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.clearButton} onPress={confirmClear}>
              <MaterialIcons name="delete-outline" size={20} color={palette.danger} />
              <Text style={styles.clearButtonText}>{t('saved_clear_data')}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  const styles = useThemedStyles(createStyles);
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function EmptyText({ text }: { text: string }) {
  const styles = useThemedStyles(createStyles);
  return <Text style={styles.emptyText}>{text}</Text>;
}

const createStyles = (palette: Palette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  content: { padding: 16, gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: palette.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.4 },
  settingsButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  subtitle: { color: palette.textMuted, fontSize: 14, marginBottom: 6 },
  sectionTitle: { color: palette.text, fontSize: 17, fontWeight: '800', marginTop: 12 },
  placeGrid: { flexDirection: 'row', gap: 10 },
  placeCard: { flex: 1, minHeight: 150, borderRadius: 16, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, padding: 14, justifyContent: 'space-between' },
  placeHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  placeName: { flex: 1, color: palette.text, fontSize: 16, fontWeight: '800' },
  placeLabel: { color: palette.textMuted, fontSize: 13, lineHeight: 18 },
  placeActions: { gap: 8 },
  placeAction: { color: palette.accent, fontSize: 13, fontWeight: '800' },
  cardList: { gap: 8 },
  listCard: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, paddingHorizontal: 14, paddingVertical: 10 },
  listText: { flex: 1, minWidth: 0 },
  listTitle: { color: palette.text, fontSize: 15, fontWeight: '700' },
  listMeta: { color: palette.textSubtle, fontSize: 12, marginTop: 2, fontWeight: '600' },
  emptyText: { borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, color: palette.textMuted, fontSize: 14, padding: 14 },
  preferencesCard: { gap: 12, borderRadius: 16, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, padding: 14 },
  preferenceLabel: { color: palette.text, fontSize: 15, fontWeight: '800' },
  languageRow: { flexDirection: 'row', gap: 8 },
  languageButton: { flex: 1, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: palette.borderStrong, paddingVertical: 9 },
  languageButtonActive: { borderColor: palette.accent, backgroundColor: palette.accent },
  languageText: { color: palette.text, fontSize: 13, fontWeight: '700' },
  languageTextActive: { color: palette.onAccent },
  dataSourceButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, borderWidth: 1, borderColor: palette.borderStrong, paddingHorizontal: 12, paddingVertical: 10 },
  dataSourceBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dataSourceText: { color: palette.accent, fontSize: 14, fontWeight: '700' },
  tramLogo: { width: 74, height: 24 },
  clearButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, borderWidth: 1, borderColor: palette.danger, backgroundColor: palette.dangerSoft, paddingHorizontal: 14, paddingVertical: 10 },
  clearButtonText: { color: palette.danger, fontSize: 14, fontWeight: '800' },
  modalSafeArea: { flex: 1, backgroundColor: palette.background, padding: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  modalTitle: { color: palette.text, fontSize: 24, fontWeight: '800' },
});
