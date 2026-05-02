import { useQueries, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_CONFIG } from '@/src/config/app-config';
import { fetchStationArrivals } from '@/src/data/tmb/data-source';
import type { Line } from '@/src/domain/catalog/models';
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
import {
  findStationInterchange,
  type StationInterchange,
  type StationInterchangeMember,
} from '@/src/features/station/utils/station-interchanges';
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

function useInterchangeArrivals(members: StationInterchangeMember[]) {
  return useQueries({
    queries: members.map((member) => ({
      queryKey: [
        'realtime',
        'arrivals',
        member.line.code,
        member.station.code,
      ] as const,
      queryFn: () =>
        fetchStationArrivals(member.line.code, member.station.code),
      enabled: Boolean(member.line.code && member.station.code),
      staleTime: 5_000,
      refetchInterval: APP_CONFIG.arrivalsPollIntervalMs,
    })),
  });
}

interface StationContentProps {
  lines?: Line[];
  stationInterchanges?: StationInterchange[];
  onLineStationSelect?: (lineCode: string, stationCode: string) => void;
}

export function StationContent({
  lines = [],
  stationInterchanges = [],
  onLineStationSelect,
}: StationContentProps) {
  const insets = useSafeAreaInsets();
  const lineCode = useTransitStore((s) => s.selectedLineCode);
  const stationCode = useTransitStore((s) => s.selectedStationCode);

  const stationsQuery = useLineStationsQuery(lineCode);
  const station = stationsQuery.data?.find((s) => s.code === stationCode);

  const arrivalsQuery = useSheetArrivals(lineCode, stationCode);
  const selectedInterchange = useMemo(
    () => findStationInterchange(stationInterchanges, lineCode, stationCode),
    [lineCode, stationCode, stationInterchanges],
  );
  const interchangeMembers = useMemo<StationInterchangeMember[]>(() => {
    if (selectedInterchange) {
      return selectedInterchange.members;
    }

    const line = lines.find((candidate) => candidate.code === lineCode);

    if (!line || !station) {
      return [];
    }

    return [{ line, station }];
  }, [lineCode, lines, selectedInterchange, station]);
  const interchangeArrivalQueries = useInterchangeArrivals(interchangeMembers);

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
  const stationName = selectedInterchange?.name ?? station?.name ?? stationCode;
  const hasMultipleLines = interchangeMembers.length > 1;

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
        <Text style={styles.title}>{stationName}</Text>
        <Text style={styles.meta}>{meta || `Line ${lineBrand.label}`}</Text>
      </View>

      {hasMultipleLines ? (
        <View style={styles.lineSwitcher}>
          <Text style={styles.sectionLabel}>Lines</Text>
          <View style={styles.lineOptions}>
            {interchangeMembers.map((member) => {
              const isActive = member.line.code === lineCode;

              return (
                <Pressable
                  key={`${member.line.code}:${member.station.code}`}
                  style={[
                    styles.lineOption,
                    isActive && styles.lineOptionActive,
                  ]}
                  onPress={() =>
                    onLineStationSelect?.(
                      member.line.code,
                      member.station.code,
                    )
                  }
                >
                  <RouteBadge lineCode={member.line.code} size="small" />
                  <Text
                    style={[
                      styles.lineOptionText,
                      isActive && styles.lineOptionTextActive,
                    ]}
                  >
                    {member.station.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

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

      {!hasMultipleLines && arrivalsQuery.isLoading ? (
        <View style={styles.feedbackRow}>
          <ActivityIndicator color="#2F7DFF" />
          <Text style={styles.feedbackText}>Loading realtime arrivals...</Text>
        </View>
      ) : null}

      {!hasMultipleLines && arrivalsQuery.isError ? (
        <Text style={styles.errorText}>
          Realtime data is temporarily unavailable.
        </Text>
      ) : null}

      {hasMultipleLines ? (
        <View style={styles.lineSections}>
          {interchangeMembers.map((member, index) => (
            <InterchangeArrivalSection
              key={`${member.line.code}:${member.station.code}`}
              isActive={member.line.code === lineCode}
              member={member}
              now={now}
              query={interchangeArrivalQueries[index]}
              onPress={() =>
                onLineStationSelect?.(member.line.code, member.station.code)
              }
            />
          ))}
        </View>
      ) : nextArrival ? (
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

      {!hasMultipleLines &&
      !arrivalsQuery.isLoading &&
      !arrivalsQuery.isError &&
      orderedArrivals.length === 0 ? (
        <Text style={styles.feedbackText}>
          No realtime arrivals for this stop right now.
        </Text>
      ) : null}
    </ScrollView>
  );
}

function InterchangeArrivalSection({
  isActive,
  member,
  now,
  query,
  onPress,
}: {
  isActive: boolean;
  member: StationInterchangeMember;
  now: number;
  query: ReturnType<typeof useInterchangeArrivals>[number] | undefined;
  onPress: () => void;
}) {
  const arrivals = useMemo(
    () => sortArrivalsByEta(query?.data ?? []),
    [query?.data],
  );
  const firstArrival = arrivals[0];
  const followingArrivals = arrivals.slice(1, 4);

  return (
    <Pressable
      style={[styles.interchangeCard, isActive && styles.interchangeCardActive]}
      onPress={onPress}
    >
      <View style={styles.interchangeHeader}>
        <RouteBadge lineCode={member.line.code} size="large" />
        <View style={styles.interchangeHeaderText}>
          <Text style={styles.interchangeDestination}>
            {firstArrival?.destination ?? member.line.name}
          </Text>
          <Text style={styles.interchangePlatform}>
            {firstArrival?.platformCode
              ? `Platform ${firstArrival.platformCode}`
              : firstArrival
                ? `Direction ${firstArrival.directionId}`
                : member.station.name}
          </Text>
        </View>
        {firstArrival ? (
          <Text style={styles.interchangeEta}>
            {formatEta(getLiveEtaSec(firstArrival, now))}
          </Text>
        ) : null}
      </View>

      {query?.isLoading ? (
        <View style={styles.feedbackRow}>
          <ActivityIndicator color="#2F7DFF" />
          <Text style={styles.feedbackText}>Loading arrivals...</Text>
        </View>
      ) : null}

      {query?.isError ? (
        <Text style={styles.errorText}>Realtime data is temporarily unavailable.</Text>
      ) : null}

      {!query?.isLoading && !query?.isError && arrivals.length === 0 ? (
        <Text style={styles.feedbackText}>No realtime arrivals right now.</Text>
      ) : null}

      {followingArrivals.length > 0 ? (
        <View style={styles.interchangeRows}>
          {followingArrivals.map((arrival, index) => (
            <View
              key={makeArrivalKey(arrival, index)}
              style={styles.interchangeRow}
            >
              <View style={styles.interchangeRowText}>
                <Text style={styles.rowDestination}>{arrival.destination}</Text>
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
    </Pressable>
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
  sectionLabel: {
    color: '#90A5C8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  lineSwitcher: {
    gap: 8,
  },
  lineOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  lineOption: {
    minWidth: 96,
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 18,
    padding: 8,
    backgroundColor: 'rgba(24, 38, 64, 0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  lineOptionActive: {
    backgroundColor: 'rgba(47, 125, 255, 0.18)',
    borderColor: 'rgba(108, 165, 255, 0.46)',
  },
  lineOptionText: {
    flex: 1,
    color: '#AFC0DE',
    fontSize: 13,
    fontWeight: '700',
  },
  lineOptionTextActive: {
    color: '#F4F8FF',
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
  lineSections: {
    gap: 10,
  },
  interchangeCard: {
    borderRadius: 24,
    padding: 14,
    backgroundColor: 'rgba(24, 38, 64, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  interchangeCardActive: {
    backgroundColor: 'rgba(38, 61, 100, 0.82)',
    borderColor: 'rgba(100, 159, 255, 0.42)',
  },
  interchangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  interchangeHeaderText: {
    flex: 1,
  },
  interchangeDestination: {
    color: '#F4F8FF',
    fontSize: 17,
    fontWeight: '800',
  },
  interchangePlatform: {
    color: '#93A8CB',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  interchangeEta: {
    color: '#4B94FF',
    fontSize: 23,
    fontWeight: '800',
  },
  interchangeRows: {
    gap: 8,
  },
  interchangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  interchangeRowText: {
    flex: 1,
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
