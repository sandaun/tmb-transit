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
import type { Line, TransportMode } from '@/src/domain/catalog/models';
import { useLineStationsQuery } from '@/src/features/catalog/hooks/use-line-stations-query';
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
function useSheetArrivals(
  mode: TransportMode,
  lineCode: string | null,
  stationCode: string | null,
  active: boolean,
) {
  const shouldPoll = Boolean(lineCode && stationCode && active);

  return useQuery({
    queryKey: ['realtime', mode, 'arrivals', lineCode, stationCode],
    queryFn: () => fetchStationArrivals(mode, lineCode!, stationCode!),
    enabled: shouldPoll,
    staleTime: 5_000,
    refetchInterval: shouldPoll ? APP_CONFIG.arrivalsPollIntervalMs : false,
  });
}

function useInterchangeArrivals(members: StationInterchangeMember[], active: boolean) {
  return useQueries({
    queries: members.map((member) => ({
      queryKey: [
        'realtime',
        member.line.mode,
        'arrivals',
        member.line.code,
        member.station.code,
      ] as const,
      queryFn: () =>
        fetchStationArrivals(member.line.mode, member.line.code, member.station.code),
      enabled: Boolean(member.line.code && member.station.code && active),
      staleTime: 5_000,
      refetchInterval: active ? APP_CONFIG.arrivalsPollIntervalMs : false,
    })),
  });
}

interface StationContentProps {
  lines?: Line[];
  stationInterchanges?: StationInterchange[];
  active?: boolean;
  onLineStationSelect?: (mode: TransportMode, lineCode: string, stationCode: string) => void;
}

export function StationContent({
  lines = [],
  stationInterchanges = [],
  active = true,
  onLineStationSelect,
}: StationContentProps) {
  const insets = useSafeAreaInsets();
  const mode = useTransitStore((s) => s.selectedMode);
  const lineCode = useTransitStore((s) => s.selectedLineCode);
  const stationCode = useTransitStore((s) => s.selectedStationCode);

  const stationsQuery = useLineStationsQuery(mode, lineCode);
  const station = stationsQuery.data?.find((s) => s.code === stationCode);

  const arrivalsQuery = useSheetArrivals(mode, lineCode, stationCode, active);
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
  const interchangeArrivalQueries = useInterchangeArrivals(interchangeMembers, active);

  const orderedArrivals = useMemo(
    () => sortArrivalsByEta(arrivalsQuery.data ?? []),
    [arrivalsQuery.data],
  );

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) {
      return;
    }
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [active]);

  if (!lineCode || !stationCode) {
    return <View />;
  }

  const activeLine = lines.find((candidate) => candidate.code === lineCode);
  const nextArrival = orderedArrivals[0];
  const followingArrivals = orderedArrivals.slice(1, 6);
  const stationName = selectedInterchange?.name ?? station?.name ?? stationCode;
  const hasMultipleLines = interchangeMembers.length > 1;

  const updatedAgoSec = arrivalsQuery.dataUpdatedAt
    ? Math.max(0, Math.floor((now - arrivalsQuery.dataUpdatedAt) / 1_000))
    : null;

  const statusColor = station ? getStationStatusColor(station) : '#86F0B4';
  const metaParts: { key: string; label: string }[] = [];
  if (station?.statusLabel) {
    metaParts.push({ key: 'status', label: station.statusLabel });
  }
  if (station?.accessibilityLabel) {
    metaParts.push({ key: 'access', label: station.accessibilityLabel });
  }
  if (updatedAgoSec !== null) {
    metaParts.push({ key: 'updated', label: `Updated ${updatedAgoSec}s ago` });
  }

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
        <View style={styles.titleRow}>
          {!hasMultipleLines ? (
            <RouteBadge lineCode={lineCode} mode={mode} color={activeLine?.color} size="small" />
          ) : null}
          <Text style={styles.title}>{stationName}</Text>
        </View>
        {metaParts.length > 0 ? (
          <View style={styles.metaRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            {metaParts.map((part, index) => (
              <View key={part.key} style={styles.metaItem}>
                {index > 0 ? <Text style={styles.metaSep}>{'\u00b7'}</Text> : null}
                <Text style={styles.metaText}>{part.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
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
                      member.line.mode,
                      member.line.code,
                      member.station.code,
                    )
                  }
                >
                  <RouteBadge lineCode={member.line.code} mode={member.line.mode} color={member.line.color} size="small" />
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
                onLineStationSelect?.(member.line.mode, member.line.code, member.station.code)
              }
            />
          ))}
        </View>
      ) : nextArrival ? (
        <View style={styles.card}>
          <View style={styles.heroRow}>
            <RouteBadge lineCode={lineCode} mode={mode} color={activeLine?.color} size="large" />
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroEyebrow}>{mode === 'bus' ? 'Next bus' : 'Next train'}</Text>
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
                  <RouteBadge lineCode={lineCode} mode={mode} color={activeLine?.color} size="small" />
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
        <RouteBadge lineCode={member.line.code} mode={member.line.mode} color={member.line.color} size="large" />
        <View style={styles.interchangeHeaderText}>
          <Text style={styles.interchangeDestination}>
            {firstArrival?.destination ?? member.line.name}
          </Text>
          {firstArrival ? (
            <Text style={styles.interchangePlatform}>
              {firstArrival.platformCode
                ? `Platform ${firstArrival.platformCode}`
                : `Direction ${firstArrival.directionId}`}
            </Text>
          ) : null}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: '#F4F8FF',
    flexShrink: 1,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#90A5C8',
    fontSize: 13,
    fontWeight: '600',
  },
  metaSep: {
    color: '#5C7099',
    fontSize: 13,
    fontWeight: '700',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginRight: 2,
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
