import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_CONFIG } from '@/src/config/app-config';
import { fetchStationArrivals } from '@/src/data/tmb/data-source';
import { useLineStationsQuery } from '@/src/features/catalog/hooks/use-line-stations-query';
import { getMetroLineBrand } from '@/src/features/catalog/utils/metro-line-brand';
import { RouteBadge } from '@/src/features/station/components/bottom-sheet/route-badge';
import {
  formatEta,
  getLiveEtaSec,
  makeArrivalKey,
  sortArrivalsByEta,
} from '@/src/features/station/utils/arrival-helpers';
import { getStationStatusColor } from '@/src/features/station/utils/station-helpers';
import { useTransitStore } from '@/src/state/store';

/**
 * Self-contained arrivals query that doesn't depend on navigation focus.
 * The map keeps this panel mounted as an overlay, so polling is tied to the
 * current selection instead of screen focus events.
 */
function useSheetArrivals(lineCode: string | null, stationCode: string | null) {
  const shouldPoll = Boolean(lineCode && stationCode);

  return useQuery({
    queryKey: ['realtime', 'arrivals', lineCode, stationCode],
    queryFn: () => fetchStationArrivals(lineCode!, stationCode!),
    enabled: shouldPoll,
    staleTime: 5_000,
    refetchInterval: shouldPoll ? APP_CONFIG.arrivalsPollIntervalMs : false,
  });
}

export function StationContent() {
  const insets = useSafeAreaInsets();
  const lineCode = useTransitStore((s) => s.selectedLineCode);
  const stationCode = useTransitStore((s) => s.selectedStationCode);

  const stationsQuery = useLineStationsQuery(lineCode);
  const station = stationsQuery.data?.find((s) => s.code === stationCode);

  const arrivalsQuery = useSheetArrivals(lineCode, stationCode);

  const orderedArrivals = useMemo(
    () => sortArrivalsByEta(arrivalsQuery.data ?? []),
    [arrivalsQuery.data],
  );

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  if (!lineCode || !stationCode) {
    return <View />;
  }

  const lineBrand = getMetroLineBrand(lineCode);
  const nextArrival = orderedArrivals[0];
  const followingArrivals = orderedArrivals.slice(1, 6);

  const updatedAgoSec = arrivalsQuery.dataUpdatedAt
    ? Math.max(0, Math.floor((now - arrivalsQuery.dataUpdatedAt) / 1_000))
    : null;

  const meta = [
    station?.accessibilityLabel,
    station?.statusLabel,
    updatedAgoSec !== null ? `Updated ${updatedAgoSec}s ago` : null,
  ]
    .filter(Boolean)
    .join('  \u2022  ');

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 32 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{station?.name ?? stationCode}</Text>
        <Text style={styles.meta}>{meta || `Line ${lineBrand.label}`}</Text>
      </View>

      <View style={styles.infoRow}>
        {station?.accessibilityLabel ? (
          <View style={styles.pill}>
            <Text style={[styles.pillText, { color: '#86F0B4' }]}>
              {station.accessibilityLabel}
            </Text>
          </View>
        ) : null}
        {station?.statusLabel ? (
          <View style={styles.pill}>
            <Text
              style={[
                styles.pillText,
                { color: getStationStatusColor(station) },
              ]}
            >
              {station.statusLabel}
            </Text>
          </View>
        ) : null}
        <View style={styles.linePill}>
          <RouteBadge lineCode={lineCode} size="small" />
        </View>
      </View>

      {station?.serviceDescription ? (
        <Text style={styles.serviceText}>{station.serviceDescription}</Text>
      ) : null}

      {arrivalsQuery.isLoading ? (
        <View style={styles.feedbackRow}>
          <ActivityIndicator color="#2F7DFF" />
          <Text style={styles.feedbackText}>Loading realtime arrivals...</Text>
        </View>
      ) : null}

      {arrivalsQuery.isError ? (
        <Text style={styles.errorText}>
          Realtime data is temporarily unavailable.
        </Text>
      ) : null}

      {nextArrival ? (
        <View style={styles.card}>
          <View style={styles.heroRow}>
            <RouteBadge lineCode={lineCode} size="large" />
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroEyebrow}>Next train</Text>
              <Text style={styles.heroTitle}>{nextArrival.destination}</Text>
              <Text style={styles.heroSubtitle}>
                {nextArrival.platformCode
                  ? `Platform ${nextArrival.platformCode}`
                  : `Direction ${nextArrival.directionId}`}
              </Text>
            </View>
            <Text style={styles.heroEta}>
              {formatEta(getLiveEtaSec(nextArrival, now))}
            </Text>
          </View>

          {followingArrivals.length > 0 && <View style={styles.divider} />}

          {followingArrivals.map((arrival, index) => (
            <View key={makeArrivalKey(arrival, index)} style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.lineRow}>
                  <RouteBadge lineCode={lineCode} size="small" />
                  <Text style={styles.rowDestination}>
                    {arrival.destination}
                  </Text>
                </View>
                <Text style={styles.rowPlatform}>
                  {arrival.platformCode
                    ? `Platform ${arrival.platformCode}`
                    : `Direction ${arrival.directionId}`}
                </Text>
              </View>
              <Text style={styles.rowEta}>
                {formatEta(getLiveEtaSec(arrival, now))}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {!arrivalsQuery.isLoading &&
      !arrivalsQuery.isError &&
      orderedArrivals.length === 0 ? (
        <Text style={styles.feedbackText}>
          No realtime arrivals for this stop right now.
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 8,
    gap: 12,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: '#F4F8FF',
  },
  meta: {
    color: '#90A5C8',
    fontSize: 14,
    lineHeight: 19,
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(28, 42, 70, 0.76)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    minHeight: 34,
  },
  linePill: {
    borderRadius: 14,
    padding: 0,
    backgroundColor: 'transparent',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  serviceText: {
    color: '#AFC0DE',
    fontSize: 14,
    lineHeight: 20,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  feedbackText: {
    color: '#93A8CB',
    fontSize: 15,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 15,
  },
  card: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: 'rgba(24, 38, 64, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroEyebrow: {
    color: '#90A5C8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#F4F8FF',
  },
  heroSubtitle: {
    marginTop: 2,
    color: '#93A8CB',
    fontSize: 12,
    fontWeight: '600',
  },
  heroEta: {
    color: '#4B94FF',
    fontSize: 24,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLeft: {
    flex: 1,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowDestination: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F4F8FF',
  },
  rowPlatform: {
    color: '#92A6C8',
    fontSize: 13,
    marginTop: 2,
  },
  rowEta: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EAF1FF',
  },
});
