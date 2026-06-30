import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ServiceAlert } from '@/src/domain/alerts/models';
import type { TransportMode } from '@/src/domain/catalog/models';
import { AlertCard } from '@/src/features/alerts/components/alert-card';
import { useServiceAlertsQuery } from '@/src/features/alerts/hooks/use-service-alerts-query';

const TAB_BAR_CLEARANCE = 96;

type AlertFilter = 'all' | TransportMode;

interface AlertStats {
  all: number;
  bus: number;
  metro: number;
}

const FILTERS: { id: AlertFilter; label: string }[] = [
  { id: 'all', label: 'Totes' },
  { id: 'metro', label: 'Metro' },
  { id: 'bus', label: 'Bus' },
];

function alertMatchesFilter(alert: ServiceAlert, filter: AlertFilter): boolean {
  if (filter === 'all') {
    return true;
  }

  return alert.mode === filter || alert.affectedLines.some((line) => line.mode === filter);
}

function countAlerts(alerts: ServiceAlert[]): AlertStats {
  return {
    all: alerts.length,
    metro: alerts.filter((alert) => alertMatchesFilter(alert, 'metro')).length,
    bus: alerts.filter((alert) => alertMatchesFilter(alert, 'bus')).length,
  };
}

interface FilterChipProps {
  active: boolean;
  count: number;
  label: string;
  onPress: () => void;
}

function FilterChip({ active, count, label, onPress }: FilterChipProps) {
  return (
    <Pressable
      style={[styles.filterChip, active ? styles.filterChipActive : null]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}>
      <Text style={[styles.filterLabel, active ? styles.filterLabelActive : null]}>
        {label}
      </Text>
      <View style={[styles.countPill, active ? styles.countPillActive : null]}>
        <Text style={[styles.countText, active ? styles.countTextActive : null]}>
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

interface AlertsHeaderProps {
  activeFilter: AlertFilter;
  error: boolean;
  isFetching: boolean;
  onFilterChange: (filter: AlertFilter) => void;
  onRetry: () => void;
  stats: AlertStats;
}

function AlertsHeader({
  activeFilter,
  error,
  isFetching,
  onFilterChange,
  onRetry,
  stats,
}: AlertsHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Alertes</Text>
          <Text style={styles.subtitle}>Metro i bus TMB</Text>
        </View>
        {isFetching ? <ActivityIndicator color="#0B5FFF" /> : null}
      </View>

      <View style={styles.summaryBand}>
        <Text style={styles.summaryValue}>{stats.all}</Text>
        <View style={styles.summaryTextWrap}>
          <Text style={styles.summaryLabel}>avisos actius</Text>
          <Text style={styles.summaryDetail}>
            {stats.metro} metro · {stats.bus} bus
          </Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((filter) => (
          <FilterChip
            key={filter.id}
            active={activeFilter === filter.id}
            count={stats[filter.id]}
            label={filter.label}
            onPress={() => onFilterChange(filter.id)}
          />
        ))}
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{"No s'han pogut actualitzar les alertes."}</Text>
          <Pressable style={styles.retryButton} onPress={onRetry} accessibilityRole="button">
            <Text style={styles.retryText}>Reintenta</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

interface EmptyStateProps {
  filter: AlertFilter;
  isLoading: boolean;
}

function EmptyState({ filter, isLoading }: EmptyStateProps) {
  if (isLoading) {
    return (
      <View style={styles.emptyState}>
        <ActivityIndicator color="#0B5FFF" />
        <Text style={styles.emptyTitle}>Carregant alertes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No hi ha alertes {filter === 'all' ? 'actives' : `de ${filter}`}.</Text>
      <Text style={styles.emptyBody}>El servei no té avisos publicats ara mateix.</Text>
    </View>
  );
}

export function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<AlertFilter>('all');
  const { data: alerts = [], error, isFetching, isLoading, refetch } = useServiceAlertsQuery();

  const stats = useMemo(() => countAlerts(alerts), [alerts]);
  const filteredAlerts = useMemo(
    () => alerts.filter((alert) => alertMatchesFilter(alert, filter)),
    [alerts, filter],
  );

  const handleOpenSource = useCallback((sourceUrl: string) => {
    void Linking.openURL(sourceUrl);
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
        affectedLines={item.affectedLines}
        dateLabel={item.dateLabel}
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
            activeFilter={filter}
            error={Boolean(error)}
            isFetching={isFetching && !isLoading}
            onFilterChange={setFilter}
            onRetry={handleRetry}
            stats={stats}
          />
        }
        ListEmptyComponent={<EmptyState filter={filter} isLoading={isLoading} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={renderAlert}
        refreshing={isFetching && !isLoading}
        onRefresh={handleRetry}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7FB',
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
    color: '#0B1220',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    color: '#4F5D75',
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
    backgroundColor: '#0B1220',
  },
  summaryValue: {
    width: 48,
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  summaryTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  summaryLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  summaryDetail: {
    marginTop: 3,
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CED4DA',
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: {
    backgroundColor: '#0B5FFF',
    borderColor: '#0B5FFF',
  },
  filterLabel: {
    color: '#1D3557',
    fontSize: 14,
    fontWeight: '800',
  },
  filterLabelActive: {
    color: '#FFFFFF',
  },
  countPill: {
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    borderRadius: 12,
    backgroundColor: '#EEF2F7',
  },
  countPillActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  countText: {
    color: '#4F5D75',
    fontSize: 12,
    fontWeight: '900',
  },
  countTextActive: {
    color: '#FFFFFF',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: '#FFF1F1',
  },
  errorText: {
    flex: 1,
    minWidth: 0,
    color: '#A11212',
    fontSize: 13,
    fontWeight: '700',
  },
  retryButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#D92D20',
  },
  retryText: {
    color: '#FFFFFF',
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
    borderColor: '#E4E7EB',
    backgroundColor: '#FFFFFF',
  },
  emptyTitle: {
    color: '#0B1220',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyBody: {
    color: '#4F5D75',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
