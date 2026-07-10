import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { TransportMode } from '@/src/domain/catalog/models';
import type { PlannedLeg, PlannedRoute } from '@/src/domain/planner/models';
import { LineBadge } from '@/src/features/catalog/components/line-badge';
import { formatDuration, getTransitRoutes } from '@/src/features/planner/utils/route-summary';
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
  isLoading: boolean;
  isError: boolean;
  onActivePointChange: (point: 'origin' | 'destination') => void;
  onEdit: () => void;
  onUseCurrentLocation: () => void;
  onPlan: () => void;
  onRouteSelect: (routeId: string) => void;
}

function formatDistance(meters: number | undefined): string {
  if (!meters) {
    return '';
  }
  if (meters >= 1_000) {
    return `${(meters / 1_000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
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
  if (distance) {
    parts.push(distance);
  }
  if (leg.routeLongName && leg.routeLongName !== leg.route) {
    parts.push(leg.routeLongName);
  }
  return parts.join(' · ');
}

function getPointValue(
  label: string | null,
  hasPoint: boolean,
  active: boolean,
  tapMap: string,
  notSet: string,
): string {
  if (label) {
    return label;
  }
  return active ? tapMap : notSet;
}

function getRouteMode(route: string): TransportMode {
  return /^L\d|^FM$/i.test(route.trim()) ? 'metro' : 'bus';
}

function getTransferLabel(transfers: number, direct: string, one: string, other: string): string {
  if (transfers === 0) {
    return direct;
  }
  return transfers === 1 ? one : other.replace('{count}', String(transfers));
}

function getWalkDurationSec(route: PlannedRoute): number {
  return route.legs.reduce(
    (total, leg) => total + (leg.mode === 'walk' ? leg.durationSec : 0),
    0,
  );
}

function formatWalkDuration(durationSec: number): string {
  if (durationSec < 60) {
    return '<1 min';
  }
  return formatDuration(durationSec);
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
  isLoading,
  isError,
  onActivePointChange,
  onEdit,
  onUseCurrentLocation,
  onPlan,
  onRouteSelect,
}: PlannerSheetProps) {
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);
  const { t } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const selectedRoute = requested
    ? routes.find((route) => route.id === selectedRouteId) ?? routes[0] ?? null
    : null;
  const canPlan = Boolean(origin && destination);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: TAB_BAR_CLEARANCE + insets.bottom },
      ]}
      scrollIndicatorInsets={{ bottom: TAB_BAR_CLEARANCE + insets.bottom }}
    >
      {requested ? (
        <View style={styles.tripSummary}>
          <View style={styles.tripSummaryText}>
            <Text numberOfLines={1} style={styles.tripSummaryOrigin}>
              {originLabel ?? t('planner_origin')}
            </Text>
            <Text style={styles.tripSummaryArrow}>{'→'}</Text>
            <Text numberOfLines={1} style={styles.tripSummaryDestination}>
              {destinationLabel ?? t('planner_destination')}
            </Text>
          </View>
          <Pressable accessibilityRole="button" style={styles.editButton} onPress={onEdit}>
            <Text style={styles.editButtonText}>{t('planner_edit')}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>{t('planner_title')}</Text>
          </View>

          <View style={styles.points}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: activePoint === 'origin' }}
              style={[styles.pointRow, activePoint === 'origin' ? styles.pointRowActive : null]}
              onPress={() => onActivePointChange('origin')}
            >
              <View style={[styles.pointDot, styles.originDot]}>
                <Text style={styles.pointDotText}>A</Text>
              </View>
              <View style={styles.pointTextWrap}>
                <Text style={styles.pointLabel}>{t('planner_origin')}</Text>
                <Text numberOfLines={1} style={styles.pointValue}>
                  {getPointValue(originLabel, Boolean(origin), activePoint === 'origin', t('planner_tap_map'), t('planner_not_set'))}
                </Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: activePoint === 'destination' }}
              style={[styles.pointRow, activePoint === 'destination' ? styles.pointRowActive : null]}
              onPress={() => onActivePointChange('destination')}
            >
              <View style={[styles.pointDot, styles.destinationDot]}>
                <Text style={styles.pointDotText}>B</Text>
              </View>
              <View style={styles.pointTextWrap}>
                <Text style={styles.pointLabel}>{t('planner_destination')}</Text>
                <Text numberOfLines={1} style={styles.pointValue}>
                  {getPointValue(
                    destinationLabel,
                    Boolean(destination),
                    activePoint === 'destination',
                    t('planner_tap_map'),
                    t('planner_not_set'),
                  )}
                </Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              style={[
                styles.secondaryButton,
                !userLocation ? styles.secondaryButtonUnavailable : null,
              ]}
              onPress={onUseCurrentLocation}
              disabled={!userLocation}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  !userLocation ? styles.secondaryButtonTextUnavailable : null,
                ]}
              >
                {userLocation ? t('planner_use_location') : t('planner_location_unavailable')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={[styles.primaryButton, !canPlan ? styles.disabled : null]}
              onPress={onPlan}
              disabled={!canPlan}
            >
              <Text style={styles.primaryButtonText}>{t('planner_plan')}</Text>
            </Pressable>
          </View>
        </>
      )}

      {!requested ? <View style={styles.divider} /> : null}

      {!requested ? (
        <View style={styles.statusBlock}>
          <Text style={styles.statusText}>{t('planner_set_points')}</Text>
        </View>
      ) : null}

      {requested && isLoading ? (
        <View style={styles.statusBlock}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.statusText}>{t('planner_calculating')}</Text>
        </View>
      ) : null}

      {requested && isError ? (
        <View style={styles.statusBlock}>
          <Text style={styles.statusTitle}>{t('planner_unavailable')}</Text>
          <Text style={styles.statusText}>{t('planner_try_later')}</Text>
        </View>
      ) : null}

      {requested && !isLoading && !isError && routes.length === 0 ? (
        <View style={styles.statusBlock}>
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
              const walkDurationSec = getWalkDurationSec(route);
              return (
                <Pressable
                  key={route.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[styles.routeRow, selected ? styles.routeRowSelected : null]}
                  onPress={() => onRouteSelect(route.id)}
                >
                  <View style={styles.routeHeader}>
                    <Text style={styles.routeDuration}>{formatDuration(route.durationSec)}</Text>
                    <Text style={styles.routeTransfer}>{getTransferLabel(route.transfers, t('planner_direct'), t('planner_transfers_one'), t('planner_transfers_other'))}</Text>
                  </View>
                  <View style={styles.routeModes}>
                    {transitRoutes.length === 0 ? (
                      <View style={styles.walkBadge}>
                        <Text style={styles.walkBadgeText}>{t('planner_walk')}</Text>
                      </View>
                    ) : (
                      transitRoutes.map((transitRoute) => (
                        <LineBadge
                          key={transitRoute}
                          lineCode={transitRoute}
                          mode={getRouteMode(transitRoute)}
                          shape="pill"
                          size="small"
                        />
                      ))
                    )}
                    <View style={styles.walkDistanceBadge}>
                      <Text style={styles.walkDistanceText}>
                        {t('planner_walk_summary', {
                          duration: formatWalkDuration(walkDurationSec),
                          distance: formatDistance(route.walkDistanceMeters),
                        })}
                      </Text>
                    </View>
                  </View>
                  {selected ? (
                    <View style={styles.routeSteps}>
                      <Text style={styles.routeStepsLabel}>{t('planner_steps')}</Text>
                      <View style={styles.steps}>
                        {route.legs.map((leg, index) => (
                          <View key={leg.id} style={styles.stepRow}>
                            <View style={styles.stepIndex}>
                              <Text style={styles.stepIndexText}>{index + 1}</Text>
                            </View>
                            <View style={styles.stepTextWrap}>
                              <Text style={styles.stepTitle}>{getLegTitle(leg, t('planner_walk_to'), t('planner_take_to'))}</Text>
                              <Text style={styles.stepMeta}>{getLegMeta(leg)}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const createStyles = (palette: Palette) => StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '800',
  },
  tripSummary: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: palette.surfaceTranslucent,
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  tripSummaryText: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  tripSummaryOrigin: {
    maxWidth: '42%',
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  tripSummaryArrow: {
    color: palette.textSubtle,
    fontSize: 15,
    fontWeight: '800',
  },
  tripSummaryDestination: {
    flex: 1,
    color: palette.text,
    fontSize: 13,
    fontWeight: '800',
  },
  editButton: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  editButtonText: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  points: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  pointRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  pointRowActive: {
    backgroundColor: palette.accentSoft,
  },
  pointDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  originDot: {
    backgroundColor: palette.statusOk,
  },
  destinationDot: {
    backgroundColor: palette.danger,
  },
  pointDotText: {
    color: palette.textInverse,
    fontSize: 12,
    fontWeight: '900',
  },
  pointTextWrap: {
    flex: 1,
  },
  pointLabel: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  pointValue: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: palette.divider,
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  secondaryButtonUnavailable: {
    backgroundColor: palette.background,
    borderColor: palette.border,
  },
  secondaryButtonText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButtonTextUnavailable: {
    color: palette.textMuted,
  },
  primaryButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: palette.accent,
  },
  primaryButtonText: {
    color: palette.onAccent,
    fontSize: 14,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.45,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.divider,
  },
  statusBlock: {
    minHeight: 84,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  statusTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '800',
  },
  statusText: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  sectionLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  routeList: {
    gap: 8,
  },
  routeRow: {
    minHeight: 92,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: palette.surfaceTranslucent,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 10,
  },
  routeRowSelected: {
    backgroundColor: palette.surfaceElevated,
    borderColor: palette.accent,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  routeDuration: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '900',
  },
  routeTransfer: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  routeModes: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },
  walkBadge: {
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: palette.accent,
  },
  walkBadgeText: {
    color: palette.onAccent,
    fontSize: 13,
    fontWeight: '900',
  },
  walkDistanceBadge: {
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderRadius: 17,
    backgroundColor: palette.accentSoft,
    borderWidth: 1,
    borderColor: palette.accent,
  },
  walkDistanceText: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  routeSteps: {
    gap: 10,
    marginTop: 2,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderStrong,
  },
  routeStepsLabel: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  steps: {
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stepIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.divider,
  },
  stepIndexText: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  stepTextWrap: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '800',
  },
  stepMeta: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
