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
import { lineKey } from '@/src/features/preferences/models';
import { useUserPreferencesStore } from '@/src/features/preferences/store';
import { useAppLanguage } from '@/src/i18n';
import type { AlertsFilter } from '@/src/features/preferences/models';
import { Text, type Palette, usePalette, useThemedStyles } from '@/src/design-system';

const TAB_BAR_CLEARANCE = 96;

type TimeFilter = AlertsFilter;
type OperatorFilter = 'all' | 'tmb' | 'fgc';

interface AlertStats {
  all: number;
  current: number;
  planned: number;
  mine: number;
}

function alertMatchesTimeFilter(
  alert: ServiceAlert,
  filter: TimeFilter,
  favoriteLineKeys: Set<string>,
): boolean {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'mine') {
    return alert.affectedLines.some((line) => favoriteLineKeys.has(lineKey(line.mode, line.code)));
  }

  return alert.kind === filter;
}

function countAlerts(alerts: ServiceAlert[], favoriteLineKeys: Set<string>): AlertStats {
  return {
    all: alerts.length,
    current: alerts.filter((alert) => alertMatchesTimeFilter(alert, 'current', favoriteLineKeys)).length,
    planned: alerts.filter((alert) => alertMatchesTimeFilter(alert, 'planned', favoriteLineKeys)).length,
    mine: alerts.filter((alert) => alertMatchesTimeFilter(alert, 'mine', favoriteLineKeys)).length,
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
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      style={[styles.segmentButton, active ? styles.segmentButtonActive : null]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}>
      <Text style={[styles.segmentLabel, active ? styles.segmentLabelActive : null]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.segmentCount, active ? styles.segmentCountActive : null]}>
        {count}
      </Text>
    </Pressable>
  );
}

interface AlertsHeaderProps {
  error: boolean;
  isFetching: boolean;
  onRetry: () => void;
  onOperatorFilterChange: (filter: OperatorFilter) => void;
  onTimeFilterChange: (filter: TimeFilter) => void;
  operatorFilter: OperatorFilter;
  operatorStats: Record<OperatorFilter, number>;
  stats: AlertStats;
  timeFilter: TimeFilter;
}

function AlertsHeader({
  error,
  isFetching,
  onRetry,
  onOperatorFilterChange,
  onTimeFilterChange,
  operatorFilter,
  operatorStats,
  stats,
  timeFilter,
}: AlertsHeaderProps) {
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);
  const { t } = useAppLanguage();
  const filters: { id: TimeFilter; label: string }[] = [
    { id: 'all', label: t('alerts_all') },
    { id: 'mine', label: t('alerts_mine') },
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
        {isFetching ? <ActivityIndicator color={palette.accent} /> : null}
      </View>

      <View style={styles.summaryBand}>
        <Text style={styles.summaryValue}>{stats.all}</Text>
        <View style={styles.summaryTextWrap}>
          <Text style={styles.summaryLabel}>{stats.all === 1 ? t('alerts_one') : t('alerts_other')}</Text>
          <Text style={styles.summaryDetail}>
            {t('alerts_summary', { current: stats.current, planned: stats.planned })}
          </Text>
        </View>
      </View>

      <View style={styles.filterStack}>
        <View style={styles.segmentedControl}>
          {filters.map((filter) => (
            <SegmentButton
              key={filter.id}
              active={timeFilter === filter.id}
              count={stats[filter.id]}
              label={filter.label}
              onPress={() => onTimeFilterChange(filter.id)}
            />
          ))}
        </View>
        <View style={styles.segmentedControl}>
          {([
            { id: 'all', label: t('alerts_all') },
            { id: 'tmb', label: 'TMB' },
            { id: 'fgc', label: 'FGC' },
          ] as const).map((filter) => (
            <SegmentButton
              key={filter.id}
              active={operatorFilter === filter.id}
              count={operatorStats[filter.id]}
              label={filter.label}
              onPress={() => onOperatorFilterChange(filter.id)}
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
  isLoading: boolean;
}

function EmptyState({ isLoading }: EmptyStateProps) {
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

  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{t('alerts_empty_title')}</Text>
      <Text style={styles.emptyBody}>{t('alerts_empty_body')}</Text>
    </View>
  );
}

export function AlertsScreen() {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const timeFilter = useUserPreferencesStore((state) => state.alertsFilter);
  const setTimeFilter = useUserPreferencesStore((state) => state.setAlertsFilter);
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
  const stats = useMemo(() => countAlerts(alerts, favoriteLineKeys), [alerts, favoriteLineKeys]);
  const operatorStats = useMemo<Record<OperatorFilter, number>>(() => ({
    all: alerts.length,
    tmb: alerts.filter((alert) => (alert.operator ?? 'tmb') === 'tmb').length,
    fgc: alerts.filter((alert) => alert.operator === 'fgc').length,
  }), [alerts]);
  const filteredAlerts = useMemo(
    () => alerts.filter((alert) =>
      alertMatchesTimeFilter(alert, timeFilter, favoriteLineKeys) &&
      (operatorFilter === 'all' || (alert.operator ?? 'tmb') === operatorFilter),
    ),
    [alerts, favoriteLineKeys, operatorFilter, timeFilter],
  );

  const handleOpenSource = useCallback((sourceUrl: string) => {
    void Linking.openURL(sourceUrl).catch(() => {
      // The alert stays visible; there is nothing actionable if the link fails.
    });
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

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
            error={Boolean(error)}
            isFetching={isFetching && !isLoading}
            onRetry={handleRetry}
            onOperatorFilterChange={setOperatorFilter}
            onTimeFilterChange={setTimeFilter}
            operatorFilter={operatorFilter}
            operatorStats={operatorStats}
            stats={stats}
            timeFilter={timeFilter}
          />
        }
        ListEmptyComponent={<EmptyState isLoading={isLoading} />}
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
  summaryBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: palette.surfaceStrong,
  },
  summaryValue: {
    width: 48,
    color: palette.textInverse,
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  summaryTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  summaryLabel: {
    color: palette.textInverse,
    fontSize: 16,
    fontWeight: '800',
  },
  summaryDetail: {
    marginTop: 3,
    color: palette.background,
    fontSize: 13,
    fontWeight: '600',
  },
  filterStack: {
    gap: 8,
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
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
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
  segmentLabel: {
    flexShrink: 1,
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  segmentLabelActive: {
    color: palette.text,
  },
  segmentCount: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  segmentCountActive: {
    color: palette.accent,
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
    minHeight: 180,
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
});
