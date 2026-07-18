import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ServiceAlert } from '@/src/domain/alerts/models';
import { AlertCard } from '@/src/features/alerts/components/alert-card';
import { useServiceAlertsQuery } from '@/src/features/alerts/hooks/use-service-alerts-query';
import {
  alertMatchesFilters,
  getAlertFilterCounts,
  type AlertFilterCounts,
  type AlertFilters,
  type OperatorFilter,
} from '@/src/features/alerts/utils/alert-filters';
import { lineKey } from '@/src/features/preferences/models';
import { useUserPreferencesStore } from '@/src/features/preferences/store';
import { useAppLanguage } from '@/src/i18n';
import type { AlertsTimeFilter } from '@/src/features/preferences/models';
import { Text, type Palette, usePalette, useThemedStyles } from '@/src/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

const TAB_BAR_CLEARANCE = 96;

interface AlertStats {
  all: number;
  current: number;
  planned: number;
}

function countAlerts(alerts: ServiceAlert[]): AlertStats {
  return {
    all: alerts.length,
    current: alerts.filter((alert) => alert.kind === 'current').length,
    planned: alerts.filter((alert) => alert.kind === 'planned').length,
  };
}

interface SegmentButtonProps {
  active: boolean;
  count: number;
  label: string;
  onPress: () => void;
}

function SegmentButton({
  active,
  count,
  label,
  onPress,
}: SegmentButtonProps) {
  const colorScheme = useColorScheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.segmentButton,
        active ? styles.segmentButtonActive : null,
        active && colorScheme === 'dark' ? styles.segmentButtonActiveDark : null,
        pressed ? styles.filterButtonPressed : null,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${count}`}
      accessibilityState={{ selected: active }}
      hitSlop={2}>
      <Text style={[styles.segmentLabel, active ? styles.segmentLabelActive : null]}>
        {label}
      </Text>
      <Text style={[styles.segmentCount, active ? styles.segmentCountActive : null]}>
        {count}
      </Text>
    </Pressable>
  );
}

interface MineFilterButtonProps {
  active: boolean;
  count: number;
  label: string;
  onPress: () => void;
}

function MineFilterButton({ active, count, label, onPress }: MineFilterButtonProps) {
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.mineFilterButton,
        active ? styles.mineFilterButtonActive : null,
        pressed ? styles.filterButtonPressed : null,
      ]}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}>
      <View style={[styles.mineFilterIcon, active ? styles.mineFilterIconActive : null]}>
        <MaterialIcons
          name={active ? 'star' : 'star-border'}
          size={20}
          color={active ? palette.onAccent : palette.favorite}
        />
      </View>
      <Text style={[styles.mineFilterLabel, active ? styles.mineFilterLabelActive : null]}>
        {label}
      </Text>
      <Text style={[styles.mineFilterCount, active ? styles.mineFilterCountActive : null]}>
        {count}
      </Text>
      <MaterialIcons
        name={active ? 'check-circle' : 'radio-button-unchecked'}
        size={21}
        color={active ? palette.accent : palette.textSubtle}
      />
    </Pressable>
  );
}

interface AlertsHeaderProps {
  filterCounts: AlertFilterCounts;
  filters: AlertFilters;
  error: boolean;
  isFetching: boolean;
  onMineOnlyChange: (mineOnly: boolean) => void;
  onRetry: () => void;
  onOperatorFilterChange: (filter: OperatorFilter) => void;
  onTimeFilterChange: (filter: AlertsTimeFilter) => void;
  stats: AlertStats;
}

function AlertsHeader({
  filterCounts,
  filters,
  error,
  isFetching,
  onMineOnlyChange,
  onRetry,
  onOperatorFilterChange,
  onTimeFilterChange,
  stats,
}: AlertsHeaderProps) {
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);
  const { t } = useAppLanguage();
  const timeOptions: { id: AlertsTimeFilter; label: string }[] = [
    { id: 'all', label: t('alerts_all') },
    { id: 'current', label: t('alerts_now') },
    { id: 'planned', label: t('alerts_planned') },
  ];
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{t('alerts_title')}</Text>
          <Text style={styles.subtitle}>{t('alerts_network')}</Text>
        </View>
        <View style={styles.summaryCompact}>
          <View style={styles.summaryHeadline}>
            <Text style={styles.summaryValue}>{stats.all}</Text>
            <Text style={styles.summaryLabel}>
              {stats.all === 1 ? t('alerts_one') : t('alerts_other')}
            </Text>
            {isFetching ? <ActivityIndicator size="small" color={palette.accent} /> : null}
          </View>
          <Text style={styles.summaryDetail}>
            {t('alerts_summary', { current: stats.current, planned: stats.planned })}
          </Text>
        </View>
      </View>

      <View style={styles.filterStack}>
        <MineFilterButton
          active={filters.mineOnly}
          count={filterCounts.mine}
          label={t('alerts_mine')}
          onPress={() => onMineOnlyChange(!filters.mineOnly)}
        />

        <View style={styles.segmentedControl} accessibilityLabel={t('alerts_filter_time')}>
          {timeOptions.map((option) => (
            <SegmentButton
              key={option.id}
              active={filters.time === option.id}
              count={filterCounts.time[option.id]}
              label={option.label}
              onPress={() => onTimeFilterChange(option.id)}
            />
          ))}
        </View>

        <View style={styles.segmentedControl} accessibilityLabel={t('alerts_filter_operator')}>
          {([
            { id: 'all', label: t('alerts_all') },
            { id: 'tmb', label: 'TMB' },
            { id: 'fgc', label: 'FGC' },
            { id: 'tram', label: 'TRAM' },
          ] as const).map((option) => (
            <SegmentButton
              key={option.id}
              active={filters.operator === option.id}
              count={filterCounts.operator[option.id]}
              label={option.label}
              onPress={() => onOperatorFilterChange(option.id)}
            />
          ))}
        </View>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{t('alerts_load_error')}</Text>
          <Pressable style={styles.retryButton} onPress={onRetry} accessibilityRole="button">
            <Text style={styles.retryText}>{t('retry')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

interface EmptyStateProps {
  hasActiveFilters: boolean;
  hasFavorites: boolean;
  isLoading: boolean;
  mineOnly: boolean;
  onResetFilters: () => void;
  totalAlerts: number;
}

function EmptyState({
  hasActiveFilters,
  hasFavorites,
  isLoading,
  mineOnly,
  onResetFilters,
  totalAlerts,
}: EmptyStateProps) {
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);
  const { t } = useAppLanguage();
  if (isLoading) {
    return (
      <View style={styles.emptyState}>
        <ActivityIndicator color={palette.accent} />
        <Text style={styles.emptyTitle}>{t('alerts_loading')}</Text>
      </View>
    );
  }

  const hasNoFavorites = mineOnly && !hasFavorites;
  const title = totalAlerts === 0
    ? t('alerts_empty_service_title')
    : hasNoFavorites
      ? t('alerts_empty_mine_title')
      : t('alerts_empty_filtered_title');
  const body = totalAlerts === 0
    ? t('alerts_empty_service_body')
    : hasNoFavorites
      ? t('alerts_empty_mine_body')
      : t('alerts_empty_filtered_body');

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <MaterialIcons
          name={totalAlerts === 0 ? 'notifications-none' : hasNoFavorites ? 'star-border' : 'filter-alt-off'}
          size={26}
          color={palette.textMuted}
        />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {hasActiveFilters ? (
        <Pressable
          style={({ pressed }) => [
            styles.resetFiltersButton,
            pressed ? styles.resetFiltersButtonPressed : null,
          ]}
          onPress={onResetFilters}
          accessibilityRole="button">
          <Text style={styles.resetFiltersText}>{t('alerts_reset_filters')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function AlertsScreen() {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const timeFilter = useUserPreferencesStore((state) => state.alertsTimeFilter);
  const mineOnly = useUserPreferencesStore((state) => state.alertsMineOnly);
  const setTimeFilter = useUserPreferencesStore((state) => state.setAlertsTimeFilter);
  const setMineOnly = useUserPreferencesStore((state) => state.setAlertsMineOnly);
  const favoriteLines = useUserPreferencesStore((state) => state.favoriteLines);
  const favoriteStops = useUserPreferencesStore((state) => state.favoriteStops);
  const { data: alerts = [], error, isFetching, isLoading, refetch } = useServiceAlertsQuery();
  const [operatorFilter, setOperatorFilter] = useState<OperatorFilter>('all');

  const favoriteLineKeys = useMemo(
    () => new Set([
      ...favoriteLines.map((line) => lineKey(line.mode, line.lineCode)),
      ...favoriteStops.map((stop) => lineKey(stop.mode, stop.lineCode)),
    ]),
    [favoriteLines, favoriteStops],
  );
  const stats = useMemo(() => countAlerts(alerts), [alerts]);
  const filters = useMemo<AlertFilters>(() => ({
    mineOnly,
    operator: operatorFilter,
    time: timeFilter,
  }), [mineOnly, operatorFilter, timeFilter]);
  const filterCounts = useMemo(
    () => getAlertFilterCounts(alerts, filters, favoriteLineKeys),
    [alerts, favoriteLineKeys, filters],
  );
  const filteredAlerts = useMemo(
    () => alerts.filter((alert) => alertMatchesFilters(alert, filters, favoriteLineKeys)),
    [alerts, favoriteLineKeys, filters],
  );
  const hasActiveFilters = timeFilter !== 'all' || operatorFilter !== 'all' || mineOnly;

  const handleOpenSource = useCallback((sourceUrl: string) => {
    void Linking.openURL(sourceUrl).catch(() => {
      // The alert stays visible; there is nothing actionable if the link fails.
    });
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleResetFilters = useCallback(() => {
    setTimeFilter('all');
    setOperatorFilter('all');
    setMineOnly(false);
  }, [setMineOnly, setTimeFilter]);

  const renderAlert = useCallback(
    ({ item }: { item: ServiceAlert }) => (
      <AlertCard
        title={item.title}
        description={item.description}
        mode={item.mode}
        severity={item.severity}
        kind={item.kind}
        affectedLines={item.affectedLines}
        dateLabel={item.dateLabel}
        updatedAtMs={item.updatedAtMs}
        sourceUrl={item.sourceUrl}
        onSourcePress={handleOpenSource}
      />
    ),
    [handleOpenSource],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <FlatList
        data={filteredAlerts}
        keyExtractor={(alert) => alert.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + TAB_BAR_CLEARANCE },
        ]}
        ListHeaderComponent={
          <AlertsHeader
            filterCounts={filterCounts}
            filters={filters}
            error={Boolean(error)}
            isFetching={isFetching && !isLoading}
            onMineOnlyChange={setMineOnly}
            onRetry={handleRetry}
            onOperatorFilterChange={setOperatorFilter}
            onTimeFilterChange={setTimeFilter}
            stats={stats}
          />
        }
        ListEmptyComponent={
          <EmptyState
            hasActiveFilters={hasActiveFilters}
            hasFavorites={favoriteLineKeys.size > 0}
            isLoading={isLoading}
            mineOnly={mineOnly}
            onResetFilters={handleResetFilters}
            totalAlerts={alerts.length}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={renderAlert}
        refreshing={isFetching && !isLoading}
        onRefresh={handleRetry}
      />
    </SafeAreaView>
  );
}

const createStyles = (palette: Palette) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    gap: 12,
    paddingBottom: 14,
  },
  titleRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: palette.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCompact: {
    flexShrink: 1,
    alignItems: 'flex-end',
    gap: 1,
  },
  summaryHeadline: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'nowrap',
    gap: 5,
  },
  summaryValue: {
    flexShrink: 0,
    color: palette.text,
    fontSize: 20,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: {
    flexShrink: 1,
    color: palette.text,
    fontSize: 13,
    fontWeight: '800',
  },
  summaryDetail: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  filterStack: {
    gap: 8,
  },
  mineFilterButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: palette.surface,
  },
  mineFilterButtonActive: {
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
  },
  mineFilterIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: palette.warningSoft,
  },
  mineFilterIconActive: {
    backgroundColor: palette.accent,
  },
  mineFilterLabel: {
    flex: 1,
    minWidth: 0,
    color: palette.text,
    fontSize: 14,
    fontWeight: '800',
  },
  mineFilterLabelActive: {
    color: palette.accentPressed,
  },
  mineFilterCount: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  mineFilterCountActive: {
    color: palette.accentPressed,
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: palette.divider,
  },
  segmentButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  segmentButtonActive: {
    backgroundColor: palette.surface,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  segmentButtonActiveDark: {
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
  },
  segmentLabel: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  segmentLabelActive: {
    color: palette.text,
  },
  segmentCount: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  segmentCountActive: {
    color: palette.accent,
  },
  filterButtonPressed: {
    opacity: 0.72,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: palette.dangerSoft,
  },
  errorText: {
    flex: 1,
    minWidth: 0,
    color: palette.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  retryButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: palette.danger,
  },
  retryText: {
    color: palette.textInverse,
    fontSize: 12,
    fontWeight: '900',
  },
  separator: {
    height: 10,
  },
  emptyState: {
    minHeight: 230,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 24,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: palette.divider,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyBody: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  resetFiltersButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: palette.accent,
  },
  resetFiltersButtonPressed: {
    backgroundColor: palette.accentPressed,
  },
  resetFiltersText: {
    color: palette.onAccent,
    fontSize: 14,
    fontWeight: '800',
  },
});
