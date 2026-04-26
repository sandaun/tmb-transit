import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import type { Station } from '@/src/domain/catalog/models';
import type { Arrival } from '@/src/domain/realtime/models';
import { MetroLineBadge } from '@/src/features/catalog/components/metro-line-badge';
import { getMetroLineBrand } from '@/src/features/catalog/utils/metro-line-brand';
import { useLineStationsQuery } from '@/src/features/catalog/hooks/use-line-stations-query';
import { MapAdapter } from '@/src/features/station/components/map-adapter';
import { useEstimatedVehicles } from '@/src/features/station/hooks/use-estimated-vehicles';
import { useLineSegmentsQuery } from '@/src/features/station/hooks/use-line-segments-query';
import { useStationArrivalsQuery } from '@/src/features/station/hooks/use-station-arrivals-query';

interface StationScreenProps {
  lineCode: string;
  stationCode: string;
  showBackButton?: boolean;
  syncRoute?: boolean;
  onStationChange?: (stationCode: string) => void;
}

type SheetSnap = 0 | 1 | 2;

const EMPTY_ARRIVALS: Arrival[] = [];
const COLLAPSED_CONTENT_HEIGHT = 220;
const HANDLE_STRIP_HEIGHT = 24;
const HOME_TAB_BAR_HEIGHT = 78;
const PIXELS_PER_SNAP = 220;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toSheetSnap(value: number, minSnap: SheetSnap): SheetSnap {
  if (value >= 1.5) {
    return 2;
  }

  if (value >= 0.5 || minSnap === 1) {
    return 1;
  }

  return 0;
}

function formatEta(etaSec: number): string {
  const safe = Math.max(0, etaSec);

  if (safe <= 45) {
    return 'Now';
  }

  if (safe >= 5 * 60) {
    return `${Math.floor(safe / 60)} min`;
  }

  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function sortArrivalsByEta(arrivals: Arrival[]): Arrival[] {
  return [...arrivals].sort((a, b) => a.etaSec - b.etaSec);
}

function makeArrivalKey(arrival: Arrival, index: number): string {
  return [
    arrival.directionId,
    arrival.platformCode ?? 'na',
    arrival.serviceId ?? arrival.destination,
    String(index),
  ].join(':');
}

function getStationStatusColor(station: Station | undefined): string {
  if (!station?.statusLabel) {
    return '#BFD2F7';
  }

  return station.statusLabel.toLowerCase() === 'operatiu' ? '#86F0B4' : '#FFD38E';
}

function SearchShell({ lineCode }: { lineCode: string }) {
  return (
    <>
      <View style={styles.searchBar}>
        <View style={styles.searchIconShell}>
          <View style={styles.searchIconCircle} />
        </View>
        <Text style={styles.searchPrompt}>Where to?</Text>
        <View style={styles.avatarShell}>
          <Text style={styles.avatarText}>OC</Text>
        </View>
      </View>

      <View style={styles.modeRow}>
        <View style={[styles.modeChip, styles.modeChipActive]}>
          <Text style={[styles.modeChipText, styles.modeChipTextActive]}>Metro</Text>
        </View>
        <View style={styles.lineModeChip}>
          <MetroLineBadge lineCode={lineCode} size="small" />
        </View>
        <View style={styles.modeChip}>
          <Text style={styles.modeChipText}>Realtime</Text>
        </View>
      </View>
    </>
  );
}

function MapTabBar({ bottomInset }: { bottomInset: number }) {
  return (
    <View style={[styles.tabBarDock, { paddingBottom: bottomInset + 10  }]}>
      <View style={styles.tabBarContent}>
        <View style={styles.tabItem}>
          <Text style={[styles.tabIcon, styles.tabIconActive]}>◉</Text>
          <Text style={[styles.tabLabel, styles.tabLabelActive]}>Map</Text>
        </View>
        <View style={styles.tabItem}>
          <Text style={styles.tabIcon}>◎</Text>
          <Text style={styles.tabLabel}>Lines</Text>
        </View>
        <View style={styles.tabItem}>
          <Text style={styles.tabIcon}>◌</Text>
          <Text style={styles.tabLabel}>Saved</Text>
        </View>
        <View style={styles.tabItem}>
          <Text style={styles.tabIcon}>⌂</Text>
          <Text style={styles.tabLabel}>You</Text>
        </View>
      </View>
    </View>
  );
}

export function StationScreen({
  lineCode,
  stationCode,
  showBackButton = true,
  syncRoute = false,
  onStationChange,
}: StationScreenProps) {
  const lineBrand = getMetroLineBrand(lineCode);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [now, setNow] = useState(Date.now());
  const [activeStationCode, setActiveStationCode] = useState(stationCode);
  const minSnap = showBackButton ? 1 : 0;
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>(minSnap);
  const sheetProgress = useRef(new Animated.Value(minSnap)).current;
  const progressRef = useRef<number>(minSnap);
  const dragStartRef = useRef<number>(minSnap);

  const tabBarSafeInset = showBackButton ? 0 : Math.max(insets.bottom, 12);
  const tabBarHeight = showBackButton ? 0 : HOME_TAB_BAR_HEIGHT + tabBarSafeInset;
  const hiddenSurfaceHeight = HANDLE_STRIP_HEIGHT + tabBarHeight;
  const expandedTotalHeight = showBackButton
    ? Math.max(COLLAPSED_CONTENT_HEIGHT + HANDLE_STRIP_HEIGHT, windowHeight - insets.top - 32)
    : Math.max(
        hiddenSurfaceHeight + COLLAPSED_CONTENT_HEIGHT + 140,
        windowHeight - insets.top - 30,
      );
  const expandedContentHeight = Math.max(
    COLLAPSED_CONTENT_HEIGHT + 140,
    expandedTotalHeight - hiddenSurfaceHeight,
  );

  const surfaceHeight = sheetProgress.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [
      hiddenSurfaceHeight,
      hiddenSurfaceHeight + COLLAPSED_CONTENT_HEIGHT,
      expandedTotalHeight,
    ],
    extrapolate: 'clamp',
  });
  const contentHeight = sheetProgress.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, COLLAPSED_CONTENT_HEIGHT, expandedContentHeight],
    extrapolate: 'clamp',
  });
  const sideInset = sheetProgress.interpolate({
    inputRange: [0, 1, 2],
    outputRange: showBackButton ? [16, 16, 10] : [28, 18, 6],
    extrapolate: 'clamp',
  });
  const bottomInset = sheetProgress.interpolate({
    inputRange: [0, 1, 2],
    outputRange: showBackButton ? [0, 0, 0] : [18, 12, 4],
    extrapolate: 'clamp',
  });
  const surfaceRadius = sheetProgress.interpolate({
    inputRange: [0, 1, 2],
    outputRange: showBackButton ? [28, 28, 24] : [34, 32, 28],
    extrapolate: 'clamp',
  });
  const backdropOpacity = sheetProgress.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0.02, 0.12, 0.32],
    extrapolate: 'clamp',
  });
  const contentOpacity = sheetProgress.interpolate({
    inputRange: [0, 0.15, 1, 2],
    outputRange: [0, 0.2, 1, 1],
    extrapolate: 'clamp',
  });
  const contentTranslateY = sheetProgress.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [14, 0, 0],
    extrapolate: 'clamp',
  });
  const dividerOpacity = sheetProgress.interpolate({
    inputRange: [0, 0.7, 1, 2],
    outputRange: [0, 0.04, 0.08, 0.12],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => clearInterval(timer);
  }, []);

  const animateToSnap = useCallback(
    (nextSnap: SheetSnap) => {
      const targetSnap = nextSnap < minSnap ? minSnap : nextSnap;
      progressRef.current = targetSnap;
      setSheetSnap(targetSnap);

      Animated.spring(sheetProgress, {
        toValue: targetSnap,
        useNativeDriver: false,
        damping: 26,
        stiffness: 240,
        mass: 0.9,
      }).start();
    },
    [minSnap, sheetProgress],
  );

  useEffect(() => {
    setActiveStationCode(stationCode);
    if (showBackButton) {
      animateToSnap(1);
    }
  }, [animateToSnap, showBackButton, stationCode]);

  const stationsQuery = useLineStationsQuery(lineCode);
  const segmentsQuery = useLineSegmentsQuery(lineCode);
  const stations = useMemo(() => stationsQuery.data ?? [], [stationsQuery.data]);

  useEffect(() => {
    if (!stations.length) {
      return;
    }

    const hasActiveStation = stations.some(
      (station) => station.code === activeStationCode,
    );
    if (hasActiveStation) {
      return;
    }

    const fallbackStation =
      stations.find((station) => station.code === stationCode) ?? stations[0];

    if (fallbackStation && fallbackStation.code !== activeStationCode) {
      setActiveStationCode(fallbackStation.code);
    }
  }, [activeStationCode, stationCode, stations]);

  const activeStation = useMemo(
    () => stations.find((station) => station.code === activeStationCode),
    [activeStationCode, stations],
  );

  const arrivalsQuery = useStationArrivalsQuery(
    lineCode || null,
    activeStationCode || null,
  );
  const arrivals = useMemo(
    () => arrivalsQuery.data ?? EMPTY_ARRIVALS,
    [arrivalsQuery.data],
  );

  const { vehicles, simulatedArrivals } = useEstimatedVehicles({
    arrivals,
    stations,
    targetStationCode: activeStationCode,
  });

  const orderedArrivals = useMemo(
    () => sortArrivalsByEta(simulatedArrivals),
    [simulatedArrivals],
  );
  const topArrivals = useMemo(() => orderedArrivals.slice(0, 2), [orderedArrivals]);
  const detailedArrivals = useMemo(
    () => orderedArrivals.slice(1, 6),
    [orderedArrivals],
  );
  const nextArrival = orderedArrivals[0];

  const updatedAgoSec = arrivalsQuery.dataUpdatedAt
    ? Math.max(0, Math.floor((now - arrivalsQuery.dataUpdatedAt) / 1_000))
    : null;

  const handleStationPress = useCallback(
    (nextStationCode: string) => {
      if (!nextStationCode) {
        return;
      }

      if (nextStationCode !== activeStationCode) {
        setActiveStationCode(nextStationCode);
        onStationChange?.(nextStationCode);

        if (syncRoute) {
          router.replace(`/station/${lineCode}/${nextStationCode}` as never);
        }
      }

      animateToSnap(1);
    },
    [activeStationCode, animateToSnap, lineCode, onStationChange, syncRoute],
  );

  const toggleSheet = useCallback(() => {
    if (sheetSnap === 0) {
      animateToSnap(1);
      return;
    }

    animateToSnap(sheetSnap === 1 ? 2 : 1);
  }, [animateToSnap, sheetSnap]);

  const hideSheet = useCallback(() => {
    animateToSnap(minSnap);
  }, [animateToSnap, minSnap]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 4 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderGrant: () => {
          dragStartRef.current = progressRef.current;
          sheetProgress.stopAnimation((value) => {
            progressRef.current = value;
            dragStartRef.current = value;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          const nextValue = clamp(
            dragStartRef.current - gestureState.dy / PIXELS_PER_SNAP,
            minSnap,
            2,
          );
          progressRef.current = nextValue;
          sheetProgress.setValue(nextValue);
        },
        onPanResponderRelease: (_, gestureState) => {
          const projected = clamp(
            dragStartRef.current -
              gestureState.dy / PIXELS_PER_SNAP -
              gestureState.vy * 0.18,
            minSnap,
            2,
          );
          animateToSnap(toSheetSnap(projected, minSnap));
        },
        onPanResponderTerminate: () => {
          animateToSnap(toSheetSnap(progressRef.current, minSnap));
        },
      }),
    [animateToSnap, minSnap, sheetProgress],
  );

  const headerMeta = [
    activeStation?.accessibilityLabel,
    activeStation?.statusLabel,
    updatedAgoSec !== null ? `Updated ${updatedAgoSec}s ago` : null,
  ]
    .filter(Boolean)
    .join('  •  ');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.root}>
        <MapAdapter
          stations={stations}
          segments={segmentsQuery.data ?? []}
          selectedStationCode={activeStationCode}
          vehicles={vehicles}
          onStationPress={handleStationPress}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.expandedBackdrop, { opacity: backdropOpacity }]}>
          <BlurView intensity={48} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={styles.expandedBackdropTint} />
        </Animated.View>
        <View pointerEvents="none" style={styles.mapScrim} />
        <View pointerEvents="none" style={styles.topGlow} />
        <View pointerEvents="none" style={styles.bottomGlow} />

        <View style={[styles.topOverlay, { top: insets.top + 8 }]}>
          {showBackButton ? (
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>{'<'}</Text>
            </Pressable>
          ) : (
            <SearchShell lineCode={lineCode} />
          )}
        </View>

        <Animated.View
          style={[
            styles.bottomSurface,
            {
              height: surfaceHeight,
              left: sideInset,
              right: sideInset,
              bottom: bottomInset,
              borderRadius: surfaceRadius,
            },
          ]}>
          <BlurView intensity={58} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={styles.bottomSurfaceTint} />
          <View style={styles.bottomSurfaceEdgeGlow} />

          <View style={styles.bottomSurfaceInner}>
            <Pressable
              onPress={toggleSheet}
              style={styles.handlePressable}
              {...panResponder.panHandlers}>
              <View style={styles.handle} />
            </Pressable>

            <Animated.View
              style={[
                styles.contentClip,
                {
                  height: contentHeight,
                  opacity: contentOpacity,
                  transform: [{ translateY: contentTranslateY }],
                },
              ]}>
              <View style={styles.sheetHeader}>
                <View style={styles.sheetHeaderTop}>
                  <View style={styles.sheetHeaderMain}>
                    <Text style={styles.stationTitle}>
                      {activeStation?.name ?? activeStationCode}
                    </Text>
                    <Text style={styles.stationMetaText}>
                      {headerMeta || `Line ${lineBrand.label}`}
                    </Text>
                  </View>
                  <Pressable style={styles.quickAction} onPress={hideSheet}>
                    <Text style={styles.quickActionText}>×</Text>
                  </Pressable>
                </View>
              </View>

              {arrivalsQuery.isLoading && simulatedArrivals.length === 0 ? (
                <View style={styles.feedbackRow}>
                  <ActivityIndicator color="#2F7DFF" />
                  <Text style={styles.feedbackInlineText}>
                    Loading realtime arrivals...
                  </Text>
                </View>
              ) : null}

              {arrivalsQuery.isError ? (
                <Text style={styles.errorText}>
                  Realtime data is temporarily unavailable.
                </Text>
              ) : null}

              {!arrivalsQuery.isLoading &&
              !arrivalsQuery.isError &&
              simulatedArrivals.length === 0 ? (
                <Text style={styles.feedbackText}>
                  No realtime arrivals for this stop right now.
                </Text>
              ) : null}

              {sheetSnap < 2 ? (
                <View style={styles.compactList}>
                  {topArrivals.map((arrival, index) => (
                    <View
                      key={makeArrivalKey(arrival, index)}
                      style={styles.compactRow}>
                      <View style={styles.compactRowLeft}>
                        <MetroLineBadge lineCode={lineCode} size="medium" />
                        <View style={styles.compactTextWrap}>
                          <Text style={styles.compactRouteText}>
                            {arrival.destination}
                          </Text>
                          <Text style={styles.compactMetaText}>
                            {arrival.platformCode
                              ? `Platform ${arrival.platformCode}`
                              : 'Realtime train'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.compactEta}>{formatEta(arrival.etaSec)}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <ScrollView
                  style={styles.expandedScroll}
                  contentContainerStyle={styles.expandedContent}
                  showsVerticalScrollIndicator={false}>
                  <View style={styles.sectionLabelRow}>
                    <Text style={styles.sectionLabel}>METRO</Text>
                  </View>

                  <View style={styles.infoRow}>
                    {activeStation?.accessibilityLabel ? (
                      <View style={styles.infoPill}>
                        <Text style={[styles.infoPillText, { color: '#86F0B4' }]}>
                          {activeStation.accessibilityLabel}
                        </Text>
                      </View>
                    ) : null}

                    {activeStation?.statusLabel ? (
                      <View style={styles.infoPill}>
                        <Text
                          style={[
                            styles.infoPillText,
                            { color: getStationStatusColor(activeStation) },
                          ]}>
                          {activeStation.statusLabel}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.lineInfoPill}>
                      <MetroLineBadge lineCode={lineCode} size="small" />
                    </View>
                  </View>

                  {activeStation?.serviceDescription ? (
                    <Text style={styles.serviceText}>
                      {activeStation.serviceDescription}
                    </Text>
                  ) : null}

                  {nextArrival ? (
                    <View style={styles.groupCard}>
                      <View style={styles.heroRow}>
                        <MetroLineBadge lineCode={lineCode} size="large" />
                        <View style={styles.heroTextWrap}>
                          <Text style={styles.heroEyebrow}>Next train</Text>
                          <Text style={styles.groupTitle}>{nextArrival.destination}</Text>
                          <Text style={styles.groupSubTitle}>
                            {nextArrival.platformCode
                              ? `Platform ${nextArrival.platformCode}`
                              : `Direction ${nextArrival.directionId}`}
                          </Text>
                        </View>
                        <Text style={styles.groupEta}>{formatEta(nextArrival.etaSec)}</Text>
                      </View>

                      {detailedArrivals.length ? <View style={styles.listDivider} /> : null}

                      {detailedArrivals.map((arrival, index) => (
                        <View
                          key={makeArrivalKey(arrival, index)}
                          style={styles.groupRow}>
                          <View style={styles.groupRowLeft}>
                            <View style={styles.groupLineRow}>
                              <MetroLineBadge lineCode={lineCode} size="small" />
                              <Text style={styles.groupDestination}>
                                {arrival.destination}
                              </Text>
                            </View>
                            <Text style={styles.groupPlatform}>
                              {arrival.platformCode
                                ? `Platform ${arrival.platformCode}`
                                : `Direction ${arrival.directionId}`}
                            </Text>
                          </View>
                          <Text style={styles.groupRowEta}>
                            {formatEta(arrival.etaSec)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </ScrollView>
              )}
            </Animated.View>

            {!showBackButton ? (
              <>
                <Animated.View
                  pointerEvents="none"
                  style={[styles.tabBarDivider, { opacity: dividerOpacity }]}
                />
                <MapTabBar bottomInset={tabBarSafeInset} />
              </>
            ) : null}
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09111E',
  },
  root: {
    flex: 1,
    backgroundColor: '#09111E',
  },
  topOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20,
  },
  mapScrim: {
    // ...StyleSheet.absoluteFillObject,
    // backgroundColor: 'rgba(4, 10, 24, 0.24)',
  },
  expandedBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  expandedBackdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 14, 31, 0.28)',
  },
  topGlow: {
    position: 'absolute',
    top: -120,
    left: -40,
    right: -40,
    height: 260,
    backgroundColor: 'rgba(12, 62, 170, 0.18)',
    borderBottomLeftRadius: 180,
    borderBottomRightRadius: 180,
  },
  bottomGlow: {
    position: 'absolute',
    left: -80,
    right: -80,
    bottom: -130,
    height: 260,
    backgroundColor: 'rgba(13, 43, 120, 0.2)',
    borderTopLeftRadius: 220,
    borderTopRightRadius: 220,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 19, 36, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButtonText: {
    color: '#F0F5FF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: -1,
  },
  searchBar: {
    borderRadius: 28,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(9, 18, 36, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchPrompt: {
    color: '#F5F8FF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    flex: 1,
  },
  searchIconShell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  searchIconCircle: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: '#D7E5FF',
    borderRadius: 9,
  },
  avatarShell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5D6BC',
  },
  avatarText: {
    color: '#24304A',
    fontSize: 12,
    fontWeight: '800',
  },
  modeRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  modeChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: 'rgba(9, 18, 36, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  lineModeChip: {
    alignItems: 'center',
    borderRadius: 14,
    padding: 4,
    backgroundColor: 'rgba(9, 18, 36, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modeChipActive: {
    backgroundColor: '#2A70FF',
    borderColor: '#2A70FF',
  },
  modeChipText: {
    color: '#D5E2FF',
    fontWeight: '700',
    fontSize: 15,
  },
  modeChipTextActive: {
    color: '#FFFFFF',
  },
  bottomSurface: {
    position: 'absolute',
    zIndex: 30,
    overflow: 'hidden',
    shadowColor: '#00102B',
    shadowOpacity: 0.42,
    shadowRadius: 28,
    shadowOffset: {
      width: 0,
      height: 18,
    },
    elevation: 24,
  },
  bottomSurfaceTint: {
    // ...StyleSheet.absoluteFillObject,
    // backgroundColor: 'rgba(8, 16, 34, 0.62)',
  },
  bottomSurfaceEdgeGlow: {
    // position: 'absolute',
    // top: -120,
    // left: 40,
    // right: 40,
    // height: 240,
    // backgroundColor: 'rgba(48, 120, 255, 0.1)',
    // borderRadius: 200,
  },
  bottomSurfaceInner: {
    flex: 1,
    overflow: 'hidden',
  },
  handlePressable: {
    height: HANDLE_STRIP_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 56,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
  },
  contentClip: {
    overflow: 'hidden',
  },
  sheetHeader: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 14,
  },
  sheetHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  sheetHeaderMain: {
    flex: 1,
  },
  quickAction: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13, 23, 42, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    marginTop: -2,
  },
  stationTitle: {
    color: '#F4F8FF',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  stationMetaText: {
    marginTop: 6,
    color: '#9BB0D6',
    fontSize: 14,
    lineHeight: 19,
  },
  feedbackRow: {
    marginHorizontal: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  feedbackInlineText: {
    color: '#AFC0DE',
    fontSize: 15,
  },
  feedbackText: {
    marginHorizontal: 18,
    marginBottom: 12,
    color: '#AFC0DE',
    fontSize: 15,
  },
  errorText: {
    marginHorizontal: 18,
    marginBottom: 12,
    color: '#FF98A6',
    fontSize: 15,
  },
  compactList: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 10,
  },
  compactRow: {
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 14,
    backgroundColor: 'rgba(28, 42, 70, 0.76)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactRowLeft: {
    flex: 1,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactTextWrap: {
    flex: 1,
  },
  compactRouteText: {
    color: '#F2F6FF',
    fontSize: 17,
    fontWeight: '700',
  },
  compactMetaText: {
    marginTop: 3,
    color: '#96AACC',
    fontSize: 13,
  },
  compactEta: {
    color: '#4B94FF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  expandedScroll: {
    flex: 1,
  },
  expandedContent: {
    paddingHorizontal: 18,
    paddingBottom: 26,
    gap: 12,
  },
  sectionLabelRow: {
    marginBottom: 2,
  },
  sectionLabel: {
    color: '#8EA3C8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoPill: {
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(28, 42, 70, 0.76)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    minHeight: 34,
    justifyContent: 'center',
  },
  lineInfoPill: {
    borderRadius: 14,
    padding: 0,
    backgroundColor: 'transparent',
  },
  infoPillText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  serviceText: {
    color: '#AFC0DE',
    fontSize: 14,
    lineHeight: 20,
  },
  groupCard: {
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
  groupTitle: {
    flex: 1,
    color: '#F4F8FF',
    fontSize: 17,
    fontWeight: '700',
  },
  groupSubTitle: {
    marginTop: 2,
    color: '#93A8CB',
    fontSize: 12,
    fontWeight: '600',
  },
  listDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 4,
  },
  groupEta: {
    color: '#4B94FF',
    fontSize: 24,
    fontWeight: '800',
  },
  groupLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  groupRowLeft: {
    flex: 1,
  },
  groupDestination: {
    color: '#F4F8FF',
    fontSize: 15,
    fontWeight: '600',
  },
  groupPlatform: {
    color: '#92A6C8',
    fontSize: 13,
    marginTop: 2,
  },
  groupRowEta: {
    color: '#EAF1FF',
    fontSize: 18,
    fontWeight: '700',
  },
  tabBarDivider: {
    height: 1,
    marginHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabBarDock: {
    minHeight: HOME_TAB_BAR_HEIGHT,
    justifyContent: 'flex-end',
    paddingTop: 10,
  },
  tabBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 70,
  },
  tabIcon: {
    color: '#7F93B8',
    fontSize: 18,
    fontWeight: '700',
  },
  tabIconActive: {
    color: '#3E86FF',
  },
  tabLabel: {
    color: '#8EA3C8',
    fontSize: 12,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#E8F0FF',
  },
});
