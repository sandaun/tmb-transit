import { useQuery } from '@tanstack/react-query';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
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
import {
  findStationInterchange,
  type StationInterchange,
  type StationInterchangeMember,
} from '@/src/features/station/utils/station-interchanges';
import { useTransitStore } from '@/src/state/store';
import { useAppLanguage } from '@/src/i18n';
import { useUserPreferencesStore } from '@/src/features/preferences/store';
import { Text, type Palette, usePalette, useThemedStyles } from '@/src/design-system';

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
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);
  const { t } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const lineSelectorRef = useRef<ScrollView | null>(null);
  const mode = useTransitStore((s) => s.selectedMode);
  const lineCode = useTransitStore((s) => s.selectedLineCode);
  const stationCode = useTransitStore((s) => s.selectedStationCode);
  const favoriteStops = useUserPreferencesStore((s) => s.favoriteStops);
  const toggleFavoriteStop = useUserPreferencesStore((s) => s.toggleFavoriteStop);

  const stationsQuery = useLineStationsQuery(mode, lineCode);
  const station = stationsQuery.data?.find((s) => s.code === stationCode);
  const activeLine = lines.find(
    (candidate) => candidate.mode === mode && candidate.code === lineCode,
  );
  const hasNoService = activeLine?.serviceStatus === 'no-service';

  const arrivalsQuery = useSheetArrivals(
    mode,
    lineCode,
    stationCode,
    active && !hasNoService,
  );
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
  const selectableInterchangeMembers = useMemo(
    () =>
      interchangeMembers.filter(
        (member, index, members) =>
          index ===
          members.findIndex(
            (candidate) =>
              candidate.line.mode === member.line.mode &&
              candidate.line.code === member.line.code,
          ),
      ),
    [interchangeMembers],
  );

  useEffect(() => {
    const activeIndex = selectableInterchangeMembers.findIndex(
      (member) => member.line.mode === mode && member.line.code === lineCode,
    );

    if (activeIndex < 0) {
      return;
    }

    requestAnimationFrame(() => {
      lineSelectorRef.current?.scrollTo({
        animated: true,
        x: Math.max(0, activeIndex * 58 - 16),
      });
    });
  }, [lineCode, mode, selectableInterchangeMembers]);

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

  const nextArrival = orderedArrivals[0];
  const followingArrivals = orderedArrivals.slice(1, 6);
  const stationName = selectedInterchange?.name ?? station?.name ?? stationCode;
  const hasMultipleLines = selectableInterchangeMembers.length > 1;
  const isFavorite = favoriteStops.some(
    (item) => item.mode === mode && item.lineCode === lineCode && item.stationCode === stationCode,
  );

  const updatedAgoSec = arrivalsQuery.dataUpdatedAt
    ? Math.max(0, Math.floor((now - arrivalsQuery.dataUpdatedAt) / 1_000))
    : null;

  const statusColor = !station?.statusLabel
    ? palette.textMuted
    : station.statusLabel.toLowerCase() === 'operatiu'
      ? palette.statusOk
      : palette.warning;
  const metaParts: { key: string; label: string }[] = [];
  if (station?.statusLabel) {
    metaParts.push({ key: 'status', label: station.statusLabel });
  }
  if (station?.accessibilityLabel) {
    metaParts.push({ key: 'access', label: station.accessibilityLabel });
  }
  if (updatedAgoSec !== null) {
    metaParts.push({ key: 'updated', label: t('station_updated', { seconds: updatedAgoSec }) });
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
          {station ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(isFavorite ? 'station_unfavorite' : 'station_favorite')}
              style={styles.favoriteButton}
              onPress={() =>
                toggleFavoriteStop({
                  mode,
                  lineCode,
                  stationCode,
                  stationName: station.name,
                })
              }
            >
              <MaterialIcons
                name={isFavorite ? 'star' : 'star-border'}
                size={22}
                color={isFavorite ? palette.favorite : palette.textMuted}
              />
            </Pressable>
          ) : null}
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
          <Text style={styles.sectionLabel}>{t('station_lines')}</Text>
          <ScrollView
            ref={lineSelectorRef}
            horizontal
            contentContainerStyle={styles.lineOptions}
            showsHorizontalScrollIndicator={false}
          >
            {selectableInterchangeMembers.map((member) => {
              const isActive =
                member.line.mode === mode && member.line.code === lineCode;

              return (
                <Pressable
                  key={`${member.line.mode}:${member.line.code}:${member.station.code}`}
                  accessibilityRole="button"
                  accessibilityLabel={t('line_accessibility', {
                    code: member.line.code,
                  })}
                  accessibilityState={{ selected: isActive }}
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
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {station?.serviceDescription ? (
        <Text style={styles.serviceText}>{station.serviceDescription}</Text>
      ) : null}

      {hasNoService ? (
        <View style={styles.noServiceNotice}>
          <MaterialIcons name="schedule" size={18} color={palette.warning} />
          <Text style={styles.noServiceText}>{t('station_no_service_today')}</Text>
        </View>
      ) : null}

      {!hasNoService && arrivalsQuery.isLoading ? (
        <View style={styles.feedbackRow}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.feedbackText}>{t('station_loading_arrivals')}</Text>
        </View>
      ) : null}

      {!hasNoService && arrivalsQuery.isError ? (
        <Text style={styles.errorText}>
          {t('station_realtime_unavailable')}
        </Text>
      ) : null}

      {!hasNoService && nextArrival ? (
        <View style={styles.card}>
          <View style={styles.heroRow}>
            <RouteBadge lineCode={lineCode} mode={mode} color={activeLine?.color} size="large" />
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroEyebrow}>{mode === 'bus' ? t('station_next_bus') : t('station_next_train')}</Text>
              <Text style={styles.heroTitle}>{nextArrival.destination}</Text>
              <Text style={styles.heroSubtitle}>
                {nextArrival.platformCode
                  ? t('station_platform', { platform: nextArrival.platformCode })
                  : t('station_direction', { direction: nextArrival.directionId })}
                {nextArrival.realtimeStatus
                  ? ` · ${t(nextArrival.realtimeStatus === 'scheduled' ? 'station_scheduled' : 'station_live')}`
                  : ''}
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
                    ? t('station_platform', { platform: arrival.platformCode })
                    : t('station_direction', { direction: arrival.directionId })}
                  {arrival.realtimeStatus
                    ? ` · ${t(arrival.realtimeStatus === 'scheduled' ? 'station_scheduled' : 'station_live')}`
                    : ''}
                </Text>
              </View>
              <Text style={styles.rowEta}>
                {formatEta(getLiveEtaSec(arrival, now))}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {!hasNoService &&
      !arrivalsQuery.isLoading &&
      !arrivalsQuery.isError &&
      orderedArrivals.length === 0 ? (
        <Text style={styles.feedbackText}>
          {t('station_no_arrivals')}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const createStyles = (palette: Palette) => StyleSheet.create({
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
    color: palette.text,
    flexShrink: 1,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: palette.divider,
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
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  metaSep: {
    color: palette.textSubtle,
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
    color: palette.textMuted,
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
    gap: 8,
    paddingRight: 20,
  },
  lineOption: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: palette.surfaceTranslucent,
    borderWidth: 1,
    borderColor: palette.border,
  },
  lineOptionActive: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accent,
  },
  serviceText: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  noServiceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.warning,
    backgroundColor: palette.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noServiceText: {
    flex: 1,
    color: palette.warning,
    fontSize: 14,
    fontWeight: '700',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  feedbackText: {
    color: palette.textMuted,
    fontSize: 15,
  },
  errorText: {
    color: palette.danger,
    fontSize: 15,
  },
  card: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
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
    color: palette.textMuted,
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
    color: palette.text,
  },
  heroSubtitle: {
    marginTop: 2,
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  heroEta: {
    color: palette.realtime,
    fontSize: 24,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: palette.divider,
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
    color: palette.text,
  },
  rowPlatform: {
    color: palette.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  rowEta: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.realtime,
  },
});
