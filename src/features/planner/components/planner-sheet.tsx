import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import type { PlannedLeg, PlannedRoute } from '@/src/domain/planner/models';
import { LineBadge } from '@/src/features/catalog/components/line-badge';
import {
  formatDistance,
  formatDuration,
  formatRouteTime,
  getTransitRoutes,
} from '@/src/features/planner/utils/route-summary';
import { getPlannerRouteMode } from '@/src/features/planner/utils/route-presentation';
import { useAppLanguage } from '@/src/i18n';
import { Text, type Palette, usePalette, useThemedStyles } from '@/src/design-system';

const TAB_BAR_CLEARANCE = 150;

interface PlannerSheetProps {
  origin: { lat: number; lon: number } | null;
  originLabel: string | null;
  destination: { lat: number; lon: number } | null;
  destinationLabel: string | null;
  userLocation: { lat: number; lon: number } | null;
  activePoint: 'origin' | 'destination';
  requested: boolean;
  routes: PlannedRoute[];
  selectedRouteId: string | null;
  selectedLegId: string | null;
  isExpanded: boolean;
  isLoading: boolean;
  isError: boolean;
  onActivePointChange: (point: 'origin' | 'destination') => void;
  onSwap: () => void;
  onUseCurrentLocation: () => void;
  onPlan: () => void;
  onRetry: () => void;
  onRouteSelect: (routeId: string) => void;
  onStepSelect: (legId: string) => void;
}

function getLegTitle(leg: PlannedLeg, walkLabel: string, takeLabel: string): string {
  if (leg.mode === 'walk') {
    return walkLabel.replace('{name}', leg.to.name);
  }
  return takeLabel.replace('{route}', leg.route ?? 'transit').replace('{name}', leg.to.name);
}

function getLegMeta(leg: PlannedLeg): string {
  const parts = [formatDuration(leg.durationSec)];
  const distance = formatDistance(leg.distanceMeters);
  if (distance) parts.push(distance);
  if (leg.routeLongName && leg.routeLongName !== leg.route) parts.push(leg.routeLongName);
  return parts.join(' · ');
}

function getTransferLabel(transfers: number, direct: string, one: string, other: string): string {
  if (transfers === 0) return direct;
  return transfers === 1 ? one : other.replace('{count}', String(transfers));
}

function getWalkDurationSec(route: PlannedRoute): number {
  return route.legs.reduce(
    (total, leg) => total + (leg.mode === 'walk' ? leg.durationSec : 0),
    0,
  );
}

function PointBadge({ label, active }: { label: 'A' | 'B'; active: boolean }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.pointBadge, active ? styles.pointBadgeActive : null]}>
      <Text style={styles.pointBadgeText}>{label}</Text>
    </View>
  );
}

export function PlannerSheet({
  origin,
  originLabel,
  destination,
  destinationLabel,
  userLocation,
  activePoint,
  requested,
  routes,
  selectedRouteId,
  selectedLegId,
  isExpanded,
  isLoading,
  isError,
  onActivePointChange,
  onSwap,
  onUseCurrentLocation,
  onPlan,
  onRetry,
  onRouteSelect,
  onStepSelect,
}: PlannerSheetProps) {
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);
  const { language, t } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView | null>(null);
  const stepOffsetsRef = useRef(new Map<string, number>());
  const stepsOffsetRef = useRef(0);
  const selectedRoute = requested
    ? routes.find((route) => route.id === selectedRouteId) ?? routes[0] ?? null
    : null;
  const canPlan = Boolean(origin && destination);
  const canSwap = Boolean(origin || destination);

  useEffect(() => {
    if (!isExpanded || !selectedLegId) return;
    const offset = stepOffsetsRef.current.get(selectedLegId);
    if (offset !== undefined) {
      scrollRef.current?.scrollTo({ y: Math.max(0, offset - 120), animated: true });
    }
  }, [isExpanded, selectedLegId]);

  useEffect(() => {
    if (!requested) return;
    if (isLoading) {
      AccessibilityInfo.announceForAccessibility(t('planner_calculating'));
    } else if (isError) {
      AccessibilityInfo.announceForAccessibility(t('planner_unavailable'));
    } else if (routes.length === 0) {
      AccessibilityInfo.announceForAccessibility(t('planner_no_route'));
    } else {
      AccessibilityInfo.announceForAccessibility(
        t('planner_routes_found', { count: routes.length }),
      );
    }
  }, [isError, isLoading, requested, routes.length, t]);

  const instruction = !origin
    ? t('planner_select_origin')
    : !destination
      ? t('planner_select_destination')
      : t('planner_ready');

  const renderPointRow = (
    point: 'origin' | 'destination',
    label: string | null,
    hasPoint: boolean,
    compact: boolean,
  ) => {
    const isOrigin = point === 'origin';
    const active = activePoint === point && !requested;
    const value = label ?? (active ? t('planner_tap_map') : t('planner_not_set'));
    return (
      <View style={[styles.pointRow, active ? styles.pointRowActive : null]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${isOrigin ? t('planner_origin') : t('planner_destination')}: ${value}`}
          accessibilityHint={isOrigin ? t('planner_edit_origin_hint') : t('planner_edit_destination_hint')}
          accessibilityState={{ selected: active }}
          style={styles.pointMainAction}
          onPress={() => onActivePointChange(point)}
        >
          <PointBadge label={isOrigin ? 'A' : 'B'} active={active} />
          <View style={styles.pointTextWrap}>
            <Text style={styles.pointLabel}>
              {isOrigin ? t('planner_origin') : t('planner_destination')}
            </Text>
            <Text numberOfLines={compact ? 2 : 1} style={styles.pointValue}>
              {value}
            </Text>
          </View>
        </Pressable>
        {isOrigin && !compact ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              userLocation ? t('planner_use_location') : t('planner_location_unavailable')
            }
            accessibilityState={{ disabled: !userLocation }}
            disabled={!userLocation}
            style={[styles.locationButton, !userLocation ? styles.unavailable : null]}
            onPress={onUseCurrentLocation}
          >
            <IconSymbol name="location.fill" size={19} color={palette.textMuted} />
          </Pressable>
        ) : null}
        {hasPoint ? <View accessibilityElementsHidden style={styles.pointSetIndicator} /> : null}
      </View>
    );
  };

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: TAB_BAR_CLEARANCE + insets.bottom },
      ]}
      scrollIndicatorInsets={{ bottom: TAB_BAR_CLEARANCE + insets.bottom }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('planner_title')}</Text>
        {canSwap ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('planner_swap')}
            style={styles.swapButton}
            onPress={onSwap}
          >
            <IconSymbol name="arrow.up.arrow.down" size={20} color={palette.accent} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.pointsCard}>
        {renderPointRow('origin', originLabel, Boolean(origin), requested)}
        <View style={styles.pointDivider} />
        {renderPointRow('destination', destinationLabel, Boolean(destination), requested)}
        <View style={styles.pointConnector} />
      </View>

      {!requested ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canPlan }}
            disabled={!canPlan}
            style={[styles.primaryButton, !canPlan ? styles.primaryButtonDisabled : null]}
            onPress={onPlan}
          >
            <Text
              style={[
                styles.primaryButtonText,
                !canPlan ? styles.primaryButtonTextDisabled : null,
              ]}
            >
              {t('planner_plan')}
            </Text>
          </Pressable>
          <Text accessibilityLiveRegion="polite" style={styles.instructionText}>
            {instruction}
          </Text>
        </>
      ) : null}

      {requested && isLoading ? (
        <View accessibilityLiveRegion="polite" style={styles.statusBlock}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.statusText}>{t('planner_calculating')}</Text>
        </View>
      ) : null}

      {requested && !isLoading && isError ? (
        <View accessibilityLiveRegion="polite" style={styles.statusBlock}>
          <Text style={styles.statusTitle}>{t('planner_unavailable')}</Text>
          <Text style={styles.statusText}>{t('planner_try_later')}</Text>
          <Pressable accessibilityRole="button" style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>{t('retry')}</Text>
          </Pressable>
        </View>
      ) : null}

      {requested && !isLoading && !isError && routes.length === 0 ? (
        <View accessibilityLiveRegion="polite" style={styles.statusBlock}>
          <Text style={styles.statusTitle}>{t('planner_no_route')}</Text>
          <Text style={styles.statusText}>{t('planner_move_point')}</Text>
        </View>
      ) : null}

      {requested && routes.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>{t('planner_options')}</Text>
          <View style={styles.routeList}>
            {routes.map((route) => {
              const selected = route.id === selectedRoute?.id;
              const transitRoutes = getTransitRoutes(route);
              const startTime = formatRouteTime(route.startTimeMs, language);
              const endTime = formatRouteTime(route.endTimeMs, language);
              const timeRange = startTime && endTime ? `${startTime}–${endTime}` : '';
              const walkSummary = [
                formatDuration(getWalkDurationSec(route)),
                formatDistance(route.walkDistanceMeters),
              ].filter(Boolean).join(' · ');

              return (
                <Pressable
                  key={route.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityHint={t('planner_expand_route')}
                  style={[styles.routeRow, selected ? styles.routeRowSelected : null]}
                  onPress={() => onRouteSelect(route.id)}
                >
                  {selected ? <View style={styles.selectedRail} /> : null}
                  <View style={styles.routeHeader}>
                    <View style={styles.routeTimeBlock}>
                      <Text style={styles.routeDuration}>{formatDuration(route.durationSec)}</Text>
                      {timeRange ? <Text style={styles.routeClock}>{timeRange}</Text> : null}
                    </View>
                    <Text style={styles.routeTransfer}>
                      {getTransferLabel(
                        route.transfers,
                        t('planner_direct'),
                        t('planner_transfers_one'),
                        t('planner_transfers_other'),
                      )}
                    </Text>
                  </View>
                  <View style={styles.routeModes}>
                    {transitRoutes.length === 0 ? (
                      <Text style={styles.walkOnlyText}>{t('planner_walk')}</Text>
                    ) : (
                      transitRoutes.map((routeCode) => {
                        const leg = route.legs.find(
                          (candidate) => candidate.mode === 'transit' && candidate.route === routeCode,
                        );
                        return (
                          <LineBadge
                            key={routeCode}
                            lineCode={routeCode}
                            mode={leg?.transportMode ?? getPlannerRouteMode(routeCode, leg?.agencyName)}
                            shape="pill"
                            size="small"
                          />
                        );
                      })
                    )}
                    <View style={styles.walkMeta}>
                      <IconSymbol name="figure.walk" size={16} color={palette.textMuted} />
                      <Text style={styles.walkMetaText}>{walkSummary}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
          {selectedRoute && isExpanded ? (
            <View
              style={styles.routeSteps}
              onLayout={(event) => {
                stepsOffsetRef.current = event.nativeEvent.layout.y;
              }}
            >
              <Text style={styles.routeStepsLabel}>{t('planner_steps')}</Text>
              {selectedRoute.legs.map((leg, index) => {
                const stepSelected = selectedLegId === leg.id;
                const handleLayout = (event: LayoutChangeEvent) => {
                  const offset = stepsOffsetRef.current + event.nativeEvent.layout.y;
                  stepOffsetsRef.current.set(leg.id, offset);
                  if (stepSelected) {
                    requestAnimationFrame(() => {
                      scrollRef.current?.scrollTo({ y: Math.max(0, offset - 120), animated: true });
                    });
                  }
                };
                return (
                  <Pressable
                    key={leg.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: stepSelected }}
                    style={[styles.stepRow, stepSelected ? styles.stepRowSelected : null]}
                    onLayout={handleLayout}
                    onPress={() => onStepSelect(leg.id)}
                  >
                    <View style={styles.stepMarkerColumn}>
                      {index < selectedRoute.legs.length - 1 ? <View style={styles.timelineLine} /> : null}
                      {leg.mode === 'transit' && leg.route ? (
                        <LineBadge
                          lineCode={leg.route}
                          mode={leg.transportMode ?? getPlannerRouteMode(leg.route, leg.agencyName)}
                          size="small"
                        />
                      ) : (
                        <View style={styles.walkStepIcon}>
                          <IconSymbol name="figure.walk" size={18} color={palette.textMuted} />
                        </View>
                      )}
                    </View>
                    <View style={styles.stepTextWrap}>
                      <Text style={styles.stepTitle}>
                        {getLegTitle(leg, t('planner_walk_to'), t('planner_take_to'))}
                      </Text>
                      <Text style={styles.stepMeta}>{getLegMeta(leg)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const createStyles = (palette: Palette) => StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 12 },
  header: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: palette.text, fontSize: 21, fontWeight: '900' },
  swapButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  pointsCard: { position: 'relative', borderRadius: 14, borderWidth: 1, borderColor: palette.borderStrong, backgroundColor: palette.surfaceTranslucent, overflow: 'hidden' },
  pointRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center' },
  pointRowActive: { backgroundColor: palette.accentSoft },
  pointMainAction: { flex: 1, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 12, paddingVertical: 8 },
  pointBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceStrong, borderWidth: 2, borderColor: 'transparent' },
  pointBadgeActive: { borderColor: palette.accent },
  pointBadgeText: { color: palette.textInverse, fontSize: 12, fontWeight: '900' },
  pointTextWrap: { flex: 1, minWidth: 0 },
  pointLabel: { color: palette.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  pointValue: { color: palette.text, fontSize: 14, lineHeight: 19, fontWeight: '800', marginTop: 1 },
  pointDivider: { height: StyleSheet.hairlineWidth, marginLeft: 52, backgroundColor: palette.border },
  pointConnector: { position: 'absolute', left: 25, top: 45, width: 2, height: 34, backgroundColor: palette.borderStrong },
  locationButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 6, borderRadius: 22 },
  unavailable: { opacity: 0.35 },
  pointSetIndicator: { width: 5, height: 5, borderRadius: 3, backgroundColor: palette.accent, marginRight: 10 },
  primaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: palette.accent },
  primaryButtonDisabled: { backgroundColor: palette.divider },
  primaryButtonText: { color: palette.onAccent, fontSize: 15, fontWeight: '900' },
  primaryButtonTextDisabled: { color: palette.textMuted },
  instructionText: { color: palette.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  statusBlock: { minHeight: 110, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  statusTitle: { color: palette.text, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  statusText: { color: palette.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  retryButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 22, backgroundColor: palette.accent },
  retryButtonText: { color: palette.onAccent, fontSize: 14, fontWeight: '800' },
  sectionLabel: { color: palette.textMuted, fontSize: 11, fontWeight: '900', letterSpacing: 0.7, textTransform: 'uppercase' },
  routeList: { gap: 10 },
  routeRow: { position: 'relative', minHeight: 96, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: palette.surfaceTranslucent, borderWidth: 1, borderColor: palette.border, gap: 10, overflow: 'hidden' },
  routeRowSelected: { backgroundColor: palette.surfaceElevated, borderColor: palette.borderStrong },
  selectedRail: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 4, backgroundColor: palette.accent },
  routeHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  routeTimeBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 9 },
  routeDuration: { color: palette.text, fontSize: 21, fontWeight: '900' },
  routeClock: { color: palette.textMuted, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  routeTransfer: { color: palette.textMuted, fontSize: 13, fontWeight: '700', marginTop: 4 },
  routeModes: { minHeight: 34, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  walkOnlyText: { color: palette.text, fontSize: 14, fontWeight: '800' },
  walkMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 5 },
  walkMetaText: { color: palette.textMuted, fontSize: 12, fontWeight: '700' },
  routeSteps: { gap: 8, paddingTop: 4 },
  routeStepsLabel: { color: palette.textMuted, fontSize: 11, fontWeight: '900', letterSpacing: 0.7, textTransform: 'uppercase' },
  stepRow: { minHeight: 64, flexDirection: 'row', gap: 12, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 12 },
  stepRowSelected: { backgroundColor: palette.accentSoft },
  stepMarkerColumn: { width: 36, alignItems: 'center' },
  timelineLine: { position: 'absolute', top: 34, bottom: -20, width: 2, backgroundColor: palette.borderStrong },
  walkStepIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.divider },
  stepTextWrap: { flex: 1, minWidth: 0, gap: 3, paddingTop: 2 },
  stepTitle: { color: palette.text, fontSize: 15, lineHeight: 20, fontWeight: '800' },
  stepMeta: { color: palette.textMuted, fontSize: 13, lineHeight: 18 },
});
