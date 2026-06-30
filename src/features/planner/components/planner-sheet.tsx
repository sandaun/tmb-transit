import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { TransportMode } from '@/src/domain/catalog/models';
import type { PlannedLeg, PlannedRoute } from '@/src/domain/planner/models';
import { LineBadge } from '@/src/features/catalog/components/line-badge';
import { formatDuration, getTransitRoutes } from '@/src/features/planner/utils/route-summary';

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

function getLegTitle(leg: PlannedLeg): string {
  if (leg.mode === 'walk') {
    return `Walk to ${leg.to.name}`;
  }
  return `Take ${leg.route ?? 'transit'} to ${leg.to.name}`;
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

function getPointValue(label: string | null, hasPoint: boolean, active: boolean): string {
  if (label) {
    return label;
  }
  return active ? 'Tap the map' : 'Not set';
}

function getRouteMode(route: string): TransportMode {
  return /^L\d|^FM$/i.test(route.trim()) ? 'metro' : 'bus';
}

function getTransferLabel(transfers: number): string {
  if (transfers === 0) {
    return 'Direct';
  }
  return `${transfers} transfer${transfers === 1 ? '' : 's'}`;
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
              {originLabel ?? 'Origin'}
            </Text>
            <Text style={styles.tripSummaryArrow}>{'→'}</Text>
            <Text numberOfLines={1} style={styles.tripSummaryDestination}>
              {destinationLabel ?? 'Destination'}
            </Text>
          </View>
          <Pressable accessibilityRole="button" style={styles.editButton} onPress={onEdit}>
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Route</Text>
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
                <Text style={styles.pointLabel}>Origin</Text>
                <Text numberOfLines={1} style={styles.pointValue}>
                  {getPointValue(originLabel, Boolean(origin), activePoint === 'origin')}
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
                <Text style={styles.pointLabel}>Destination</Text>
                <Text numberOfLines={1} style={styles.pointValue}>
                  {getPointValue(
                    destinationLabel,
                    Boolean(destination),
                    activePoint === 'destination',
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
                {userLocation ? 'Use my location' : 'Location unavailable'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={[styles.primaryButton, !canPlan ? styles.disabled : null]}
              onPress={onPlan}
              disabled={!canPlan}
            >
              <Text style={styles.primaryButtonText}>Plan</Text>
            </Pressable>
          </View>
        </>
      )}

      {!requested ? <View style={styles.divider} /> : null}

      {!requested ? (
        <View style={styles.statusBlock}>
          <Text style={styles.statusText}>Set A and B on the map, then plan the route.</Text>
        </View>
      ) : null}

      {requested && isLoading ? (
        <View style={styles.statusBlock}>
          <ActivityIndicator color="#2A70FF" />
          <Text style={styles.statusText}>Calculating routes...</Text>
        </View>
      ) : null}

      {requested && isError ? (
        <View style={styles.statusBlock}>
          <Text style={styles.statusTitle}>Planner unavailable</Text>
          <Text style={styles.statusText}>Try again in a moment.</Text>
        </View>
      ) : null}

      {requested && !isLoading && !isError && routes.length === 0 ? (
        <View style={styles.statusBlock}>
          <Text style={styles.statusTitle}>No route found</Text>
          <Text style={styles.statusText}>Move one of the points and plan again.</Text>
        </View>
      ) : null}

      {requested && routes.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>Options</Text>
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
                    <Text style={styles.routeTransfer}>{getTransferLabel(route.transfers)}</Text>
                  </View>
                  <View style={styles.routeModes}>
                    {transitRoutes.length === 0 ? (
                      <View style={styles.walkBadge}>
                        <Text style={styles.walkBadgeText}>Walk</Text>
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
                        {formatWalkDuration(walkDurationSec)} walk ·{' '}
                        {formatDistance(route.walkDistanceMeters)}
                      </Text>
                    </View>
                  </View>
                  {selected ? (
                    <View style={styles.routeSteps}>
                      <Text style={styles.routeStepsLabel}>Steps</Text>
                      <View style={styles.steps}>
                        {route.legs.map((leg, index) => (
                          <View key={leg.id} style={styles.stepRow}>
                            <View style={styles.stepIndex}>
                              <Text style={styles.stepIndexText}>{index + 1}</Text>
                            </View>
                            <View style={styles.stepTextWrap}>
                              <Text style={styles.stepTitle}>{getLegTitle(leg)}</Text>
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

const styles = StyleSheet.create({
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
    color: '#F4F8FF',
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
    backgroundColor: 'rgba(10, 19, 36, 0.64)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
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
    color: '#D7E5FF',
    fontSize: 13,
    fontWeight: '700',
  },
  tripSummaryArrow: {
    color: '#7F93BA',
    fontSize: 15,
    fontWeight: '800',
  },
  tripSummaryDestination: {
    flex: 1,
    color: '#F4F8FF',
    fontSize: 13,
    fontWeight: '800',
  },
  editButton: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  editButtonText: {
    color: '#8FB4FF',
    fontSize: 13,
    fontWeight: '800',
  },
  points: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  pointDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  originDot: {
    backgroundColor: '#0F7B5C',
  },
  destinationDot: {
    backgroundColor: '#D24545',
  },
  pointDotText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  pointTextWrap: {
    flex: 1,
  },
  pointLabel: {
    color: '#D7E5FF',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  pointValue: {
    color: '#F4F8FF',
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
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  secondaryButtonUnavailable: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  secondaryButtonText: {
    color: '#F4F8FF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButtonTextUnavailable: {
    color: '#AABBDC',
  },
  primaryButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#2A70FF',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.45,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusBlock: {
    minHeight: 84,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  statusTitle: {
    color: '#F4F8FF',
    fontSize: 17,
    fontWeight: '800',
  },
  statusText: {
    color: '#AABBDC',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  sectionLabel: {
    color: '#E7EEFF',
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
    backgroundColor: 'rgba(10, 19, 36, 0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 10,
  },
  routeRowSelected: {
    backgroundColor: 'rgba(18, 39, 76, 0.88)',
    borderColor: '#2A70FF',
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  routeDuration: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  routeTransfer: {
    color: '#D7E5FF',
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
    backgroundColor: '#2A70FF',
  },
  walkBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  walkDistanceBadge: {
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderRadius: 17,
    backgroundColor: 'rgba(42, 112, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(88, 145, 255, 0.42)',
  },
  walkDistanceText: {
    color: '#C9DBFF',
    fontSize: 13,
    fontWeight: '800',
  },
  routeSteps: {
    gap: 10,
    marginTop: 2,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  routeStepsLabel: {
    color: '#D7E5FF',
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
    backgroundColor: '#17243D',
  },
  stepIndexText: {
    color: '#D7E5FF',
    fontSize: 12,
    fontWeight: '800',
  },
  stepTextWrap: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    color: '#F4F8FF',
    fontSize: 15,
    fontWeight: '800',
  },
  stepMeta: {
    color: '#D7E5FF',
    fontSize: 13,
    lineHeight: 18,
  },
});
