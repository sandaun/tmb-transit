import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Line, TransportMode } from '@/src/domain/catalog/models';
import { useAllLineStationsQuery } from '@/src/features/catalog/hooks/use-all-line-stations-query';
import {
  fetchAndCacheLineStations,
  useLineStationsQuery,
} from '@/src/features/catalog/hooks/use-line-stations-query';
import { useLinesQuery } from '@/src/features/catalog/hooks/use-lines-query';
import { getLineBrand } from '@/src/features/catalog/utils/line-brand';
import { PlannerSheet } from '@/src/features/planner/components/planner-sheet';
import { usePlannedRoutesQuery } from '@/src/features/planner/hooks/use-planned-routes-query';
import { sortPlannedRoutes } from '@/src/features/planner/utils/route-summary';
import {
  LocalBottomSheet,
  type LocalBottomSheetHandle,
} from '@/src/features/station/components/bottom-sheet/local-bottom-sheet';
import { MapScreen } from '@/src/features/station/components/map-screen';
import type { PlannerMapPolyline } from '@/src/features/station/components/map-adapter';
import type { NearbyStop } from '@/src/features/nearby/hooks/use-nearby-stops-query';
import type { PlannedLeg, PlannedRoute } from '@/src/domain/planner/models';
import { StationContent } from '@/src/features/station/components/station-content';
import { buildStationInterchanges } from '@/src/features/station/utils/station-interchanges';
import type { SavedPlaceId } from '@/src/features/preferences/models';
import { useUserPreferencesStore } from '@/src/features/preferences/store';
import { useAppLanguage } from '@/src/i18n';
import { useTransitStore } from '@/src/state/store';
import { Text, type Palette, usePalette, useThemedStyles } from '@/src/design-system';

function pickDefaultLineCode(mode: TransportMode, lines: Line[]): string | null {
  if (!lines.length) {
    return null;
  }

  if (mode === 'metro') {
    const l3 = lines.find(
      (line) => line.code.toLowerCase() === 'l3' || line.code === '3',
    );
    return (l3 ?? lines[0]).code;
  }

  return lines[0].code;
}

const SHEET_DETENTS = [0.1, 0.5, 1] as const;

type PlannerPointKind = 'origin' | 'destination';

function formatCoordinateLabel(coordinate: { lat: number; lon: number }): string {
  return `${coordinate.lat.toFixed(5)}, ${coordinate.lon.toFixed(5)}`;
}

function formatGeocodedAddress(address: Location.LocationGeocodedAddress | undefined): string | null {
  if (!address) {
    return null;
  }

  const streetLine = [address.street, address.streetNumber]
    .filter((part): part is string => Boolean(part))
    .join(' ');
  const area = address.city ?? address.district ?? address.subregion ?? address.region;

  if (streetLine && area) {
    return `${streetLine}, ${area}`;
  }

  return address.name ?? streetLine ?? area ?? null;
}

async function resolvePlannerPointLabel(coordinate: { lat: number; lon: number }): Promise<string> {
  try {
    const [address] = await Location.reverseGeocodeAsync({
      latitude: coordinate.lat,
      longitude: coordinate.lon,
    });
    return formatGeocodedAddress(address) ?? formatCoordinateLabel(coordinate);
  } catch {
    return formatCoordinateLabel(coordinate);
  }
}

function getLegPoints(leg: PlannedLeg): { lat: number; lon: number }[] {
  if (leg.points.length > 1) {
    return leg.points;
  }
  if (
    leg.from.lat !== undefined &&
    leg.from.lon !== undefined &&
    leg.to.lat !== undefined &&
    leg.to.lon !== undefined
  ) {
    return [
      { lat: leg.from.lat, lon: leg.from.lon },
      { lat: leg.to.lat, lon: leg.to.lon },
    ];
  }
  return [];
}

function getPlannedLegTransportMode(leg: PlannedLeg): TransportMode {
  const route = leg.route?.trim().toUpperCase() ?? '';
  return /^L\d|^FM$/.test(route) ? 'metro' : 'bus';
}

function normalizePlannerPointName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isInternalTransferWalk(
  leg: PlannedLeg,
  previousLeg: PlannedLeg | undefined,
  nextLeg: PlannedLeg | undefined,
): boolean {
  if (leg.mode !== 'walk' || previousLeg?.mode !== 'transit' || nextLeg?.mode !== 'transit') {
    return false;
  }

  const fromName = normalizePlannerPointName(leg.from.name);
  const toName = normalizePlannerPointName(leg.to.name);
  if (fromName && toName && fromName === toName) {
    return true;
  }

  return (leg.distanceMeters ?? Number.POSITIVE_INFINITY) <= 80;
}

function getRoutePolylines(route: PlannedRoute | null, walkColor: string): PlannerMapPolyline[] {
  if (!route) {
    return [];
  }

  return route.legs
    .map((leg, index) => {
      if (isInternalTransferWalk(leg, route.legs[index - 1], route.legs[index + 1])) {
        return null;
      }

      const points = getLegPoints(leg);
      if (points.length < 2) {
        return null;
      }

      const color =
        leg.mode === 'walk'
          ? walkColor
          : getLineBrand(getPlannedLegTransportMode(leg), leg.route ?? '').backgroundColor;

      return {
        id: leg.id,
        points,
        color,
      };
    })
    .filter((polyline): polyline is PlannerMapPolyline => polyline !== null);
}

export default function MapTabScreen() {
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{
    savePlace?: string;
    planFrom?: string;
    originLat?: string;
    originLon?: string;
    originLabel?: string;
  }>();
  const { t } = useAppLanguage();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const mode = useTransitStore((s) => s.selectedMode);
  const selectedLineCode = useTransitStore((s) => s.selectedLineCode);
  const selectedStationCode = useTransitStore((s) => s.selectedStationCode);
  const setSelection = useTransitStore((s) => s.setSelection);
  const preferencesHydrated = useUserPreferencesStore((s) => s.isHydrated);
  const lastMapSelection = useUserPreferencesStore((s) => s.lastMapSelection);
  const savedPlaces = useUserPreferencesStore((s) => s.savedPlaces);
  const setSavedPlace = useUserPreferencesStore((s) => s.setSavedPlace);
  const setLastMapSelection = useUserPreferencesStore((s) => s.setLastMapSelection);
  const addRecentItem = useUserPreferencesStore((s) => s.addRecentItem);

  const {
    data: lines = [],
    isLoading: linesLoading,
    error: linesError,
    refetch: refetchLines,
  } = useLinesQuery(mode);

  const lineCode =
    (selectedLineCode && lines.some((line) => line.code === selectedLineCode) && selectedLineCode) ||
    pickDefaultLineCode(mode, lines);

  const {
    data: stations = [],
    isLoading: stationsLoading,
    error: stationsError,
    refetch: refetchStations,
  } = useLineStationsQuery(mode, lineCode);
  const interchangeLines = useMemo(() => (mode === 'metro' ? lines : []), [lines, mode]);
  const allStationsQuery = useAllLineStationsQuery(interchangeLines);
  const stationInterchanges = useMemo(
    () => buildStationInterchanges(interchangeLines, allStationsQuery.stationsByLine),
    [allStationsQuery.stationsByLine, interchangeLines],
  );

  const stationCode =
    (selectedStationCode &&
      stations.some((s) => s.code === selectedStationCode) &&
      selectedStationCode) ||
    stations[0]?.code ||
    null;

  const sheetRef = useRef<LocalBottomSheetHandle>(null);
  const [detentIndex, setDetentIndex] = useState(0);
  const [plannerEnabled, setPlannerEnabled] = useState(false);
  const [plannerActivePoint, setPlannerActivePoint] = useState<'origin' | 'destination'>(
    'destination',
  );
  const [plannerOrigin, setPlannerOrigin] = useState<{ lat: number; lon: number } | null>(null);
  const [plannerOriginLabel, setPlannerOriginLabel] = useState<string | null>(null);
  const [plannerDestination, setPlannerDestination] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const [plannerDestinationLabel, setPlannerDestinationLabel] = useState<string | null>(null);
  const [plannerUserLocation, setPlannerUserLocation] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const [plannerRequested, setPlannerRequested] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [placeToSave, setPlaceToSave] = useState<SavedPlaceId | null>(null);
  const originLabelRequestRef = useRef(0);
  const destinationLabelRequestRef = useRef(0);
  const lineChangeRequestRef = useRef(0);
  const handledRouteIntentRef = useRef<string | null>(null);

  const plannedRoutesQuery = usePlannedRoutesQuery(plannerOrigin, plannerDestination, {
    enabled: plannerEnabled && plannerRequested,
  });
  const plannedRoutes = useMemo(
    () => sortPlannedRoutes(plannedRoutesQuery.data ?? []),
    [plannedRoutesQuery.data],
  );
  const selectedRoute = plannerRequested
    ? plannedRoutes.find((route) => route.id === selectedRouteId) ?? plannedRoutes[0] ?? null
    : null;
  const selectedRoutePolylines = useMemo(
    () => getRoutePolylines(selectedRoute, palette.accent),
    [palette.accent, selectedRoute],
  );

  const sheetHeight = useMemo(() => {
    const usableHeight = Math.max(0, windowHeight - Math.max(insets.top, 48));
    const detent = SHEET_DETENTS[detentIndex] ?? SHEET_DETENTS[0];
    const raw = Math.max(116, Math.round(usableHeight * detent));
    const maxButtonInset = Math.round(windowHeight * 0.45);
    return Math.min(raw, maxButtonInset);
  }, [detentIndex, insets.top, windowHeight]);

  useEffect(() => {
    // Restore only the initial null selection. An empty line code is used while
    // a user-requested mode change loads its default line and must not be reset.
    if (!preferencesHydrated || !lastMapSelection || selectedLineCode !== null) {
      return;
    }
    setSelection(
      lastMapSelection.mode,
      lastMapSelection.lineCode,
      lastMapSelection.stationCode,
    );
  }, [lastMapSelection, preferencesHydrated, selectedLineCode, setSelection]);

  useEffect(() => {
    if (!preferencesHydrated) {
      return;
    }
    if (!lineCode || !stationCode) {
      return;
    }

    if (selectedLineCode !== lineCode || selectedStationCode !== stationCode) {
      setSelection(mode, lineCode, stationCode);
    }

    if (
      lastMapSelection?.mode !== mode ||
      lastMapSelection?.lineCode !== lineCode ||
      lastMapSelection?.stationCode !== stationCode
    ) {
      setLastMapSelection({ mode, lineCode, stationCode });
    }
  }, [
    lineCode,
    lastMapSelection,
    mode,
    preferencesHydrated,
    selectedLineCode,
    selectedStationCode,
    setLastMapSelection,
    setSelection,
    stationCode,
  ]);

  useEffect(() => {
    if (!plannedRoutes.length) {
      setSelectedRouteId(null);
      return;
    }
    if (!selectedRouteId || !plannedRoutes.some((route) => route.id === selectedRouteId)) {
      setSelectedRouteId(plannedRoutes[0].id);
    }
    if (plannerEnabled && plannerRequested) {
      sheetRef.current?.resize(1);
    }
  }, [plannedRoutes, plannerEnabled, plannerRequested, selectedRouteId]);

  const handleDetentChange = useCallback((nextDetentIndex: number) => {
    setDetentIndex(nextDetentIndex);
  }, []);

  const cancelPendingLineChange = useCallback(() => {
    lineChangeRequestRef.current += 1;
  }, []);

  const handleModeChange = useCallback(
    (nextMode: TransportMode) => {
      if (nextMode === mode) return;
      cancelPendingLineChange();
      setSelection(nextMode, '', '');
      sheetRef.current?.resize(0);
    },
    [cancelPendingLineChange, mode, setSelection],
  );

  const handleLineChange = useCallback(
    (nextLineCode: string) => {
      if (nextLineCode === lineCode) return;

      const nextLine = lines.find((line) => line.code === nextLineCode);
      const nextMode = nextLine?.mode ?? mode;
      const requestId = lineChangeRequestRef.current + 1;
      lineChangeRequestRef.current = requestId;

      sheetRef.current?.resize(0);

      void queryClient
        .fetchQuery({
          queryKey: ['catalog', nextMode, 'stations', nextLineCode] as const,
          queryFn: () => fetchAndCacheLineStations(nextMode, nextLineCode),
        })
        .then((nextStations) => {
          if (lineChangeRequestRef.current !== requestId) {
            return;
          }

          setSelection(nextMode, nextLineCode, nextStations[0]?.code ?? '');
        })
        .catch(() => {
          if (lineChangeRequestRef.current !== requestId) {
            return;
          }

          setSelection(nextMode, nextLineCode, '');
        });
    },
    [lineCode, lines, mode, queryClient, setSelection],
  );

  const handleStationChange = useCallback(
    (nextStationCode: string) => {
      if (!lineCode) return;
      cancelPendingLineChange();
      setSelection(mode, lineCode, nextStationCode);
      const station = stations.find((item) => item.code === nextStationCode);
      if (station) {
        addRecentItem({
          kind: 'station',
          mode,
          lineCode,
          stationCode: station.code,
          stationName: station.name,
          visitedAtMs: Date.now(),
        });
      }
      sheetRef.current?.resize(1);
    },
    [addRecentItem, cancelPendingLineChange, lineCode, mode, setSelection, stations],
  );
  const handleLineStationSelect = useCallback(
    (nextMode: TransportMode, nextLineCode: string, nextStationCode: string) => {
      cancelPendingLineChange();
      setSelection(nextMode, nextLineCode, nextStationCode);
      sheetRef.current?.resize(1);
    },
    [cancelPendingLineChange, setSelection],
  );

  const handleNearbyStopSelect = useCallback(
    (stop: NearbyStop) => {
      cancelPendingLineChange();
      const effectiveLineCode =
        stop.lineCode || (stop.mode === mode ? lineCode : '') || '';
      setSelection(stop.mode, effectiveLineCode, stop.code);
      addRecentItem({
        kind: 'station',
        mode: stop.mode,
        lineCode: effectiveLineCode,
        stationCode: stop.code,
        stationName: stop.name,
        visitedAtMs: Date.now(),
      });
      sheetRef.current?.resize(1);
    },
    [addRecentItem, cancelPendingLineChange, lineCode, mode, setSelection],
  );

  const resetPlannerRequest = useCallback(() => {
    setPlannerRequested(false);
    setSelectedRouteId(null);
  }, []);

  const setPlannerPoint = useCallback(
    (
      point: PlannerPointKind,
      coordinate: { lat: number; lon: number },
      initialLabel: string,
      resolveAddress = true,
    ) => {
      const requestRef =
        point === 'origin' ? originLabelRequestRef : destinationLabelRequestRef;
      const setCoordinate = point === 'origin' ? setPlannerOrigin : setPlannerDestination;
      const setLabel = point === 'origin' ? setPlannerOriginLabel : setPlannerDestinationLabel;

      requestRef.current += 1;
      const requestId = requestRef.current;
      setCoordinate(coordinate);
      setLabel(initialLabel);

      if (!resolveAddress) {
        return;
      }

      void resolvePlannerPointLabel(coordinate).then((label) => {
        if (requestRef.current === requestId) {
          setLabel(label);
        }
      });
    },
    [],
  );

  const handlePlannerToggle = useCallback(() => {
    setPlannerEnabled((current) => {
      const next = !current;
      if (next) {
        sheetRef.current?.resize(1);
      } else {
        resetPlannerRequest();
        sheetRef.current?.resize(0);
      }
      return next;
    });
  }, [resetPlannerRequest]);

  const handlePlannerMapPress = useCallback(
    (coordinate: { lat: number; lon: number }) => {
      if (plannerRequested) {
        return;
      }

      if (plannerActivePoint === 'origin') {
        setPlannerPoint('origin', coordinate, t('map_selected_point'));
        setPlannerActivePoint('destination');
      } else {
        setPlannerPoint('destination', coordinate, t('map_selected_point'));
      }
      resetPlannerRequest();
      sheetRef.current?.resize(1);
    },
    [plannerActivePoint, plannerRequested, resetPlannerRequest, setPlannerPoint, t],
  );

  const handlePlannerActivePointChange = useCallback(
    (point: PlannerPointKind) => {
      setPlannerActivePoint(point);
      if (plannerRequested) {
        resetPlannerRequest();
        sheetRef.current?.resize(1);
      }
    },
    [plannerRequested, resetPlannerRequest],
  );

  const handlePlannerUseCurrentLocation = useCallback(
    (coordinate: { lat: number; lon: number } | null) => {
      if (!coordinate) {
        return;
      }
      setPlannerPoint('origin', coordinate, t('map_current_location'), false);
      setPlannerActivePoint('destination');
      resetPlannerRequest();
      sheetRef.current?.resize(1);
    },
    [resetPlannerRequest, setPlannerPoint, t],
  );

  const handlePlannerPlan = useCallback(() => {
    if (!plannerOrigin || !plannerDestination) {
      return;
    }
    addRecentItem({
      kind: 'route',
      origin: {
        lat: plannerOrigin.lat,
        lon: plannerOrigin.lon,
        label: plannerOriginLabel ?? formatCoordinateLabel(plannerOrigin),
      },
      destination: {
        lat: plannerDestination.lat,
        lon: plannerDestination.lon,
        label: plannerDestinationLabel ?? formatCoordinateLabel(plannerDestination),
      },
      visitedAtMs: Date.now(),
    });
    setPlannerRequested(true);
    sheetRef.current?.resize(1);
  }, [addRecentItem, plannerDestination, plannerDestinationLabel, plannerOrigin, plannerOriginLabel]);

  const handlePlaceSaveMapPress = useCallback(
    (coordinate: { lat: number; lon: number }) => {
      if (!placeToSave) return;
      const id = placeToSave;
      setPlaceToSave(null);
      void resolvePlannerPointLabel(coordinate).then((label) => {
        setSavedPlace({ id, label, ...coordinate, updatedAtMs: Date.now() });
        router.setParams({ savePlace: undefined });
        router.navigate('/you');
      });
    },
    [placeToSave, setSavedPlace],
  );

  useEffect(() => {
    if (params.savePlace === 'home' || params.savePlace === 'work') {
      setPlannerEnabled(false);
      setPlaceToSave(params.savePlace);
      sheetRef.current?.resize(1);
    }
  }, [params.savePlace]);

  useEffect(() => {
    const intentKey = [params.planFrom, params.originLat, params.originLon, params.originLabel].join(':');
    if (!intentKey || handledRouteIntentRef.current === intentKey) return;

    let origin: { lat: number; lon: number; label: string } | null = null;
    if (params.planFrom === 'home' || params.planFrom === 'work') {
      const place = savedPlaces[params.planFrom];
      if (place) origin = place;
    } else {
      const lat = Number(params.originLat);
      const lon = Number(params.originLon);
      if (Number.isFinite(lat) && Number.isFinite(lon) && params.originLabel) {
        origin = { lat, lon, label: params.originLabel };
      }
    }

    if (!origin) return;
    handledRouteIntentRef.current = intentKey;
    setPlaceToSave(null);
    setPlannerEnabled(true);
    setPlannerPoint('origin', origin, origin.label, false);
    setPlannerActivePoint('destination');
    resetPlannerRequest();
    sheetRef.current?.resize(1);
    router.setParams({
      planFrom: undefined,
      originLat: undefined,
      originLon: undefined,
      originLabel: undefined,
    });
  }, [params.originLabel, params.originLat, params.originLon, params.planFrom, resetPlannerRequest, savedPlaces, setPlannerPoint]);

  const handleRetryMapData = useCallback(() => {
    void refetchLines();
    void refetchStations();
  }, [refetchLines, refetchStations]);

  if (linesLoading || stationsLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={palette.accent} />
        <Text style={styles.loadingText}>{t('map_loading')}</Text>
      </View>
    );
  }

  // Reached only when loading finished: either an upstream error, or the line
  // came back with no usable stations. Both must offer a way out instead of a
  // spinner that never resolves.
  if (linesError || stationsError || !lineCode || !stationCode) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>{t('map_error_title')}</Text>
        <Text style={styles.fallbackText}>{t('map_error_body')}</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.fallbackButton}
          onPress={handleRetryMapData}
        >
          <Text style={styles.fallbackButtonText}>{t('retry')}</Text>
        </Pressable>
      </View>
    );
  }

  const isCollapsed = detentIndex === 0;

  return (
    <View style={styles.root}>
      <MapScreen
        lineCode={lineCode}
        lines={lines}
        mode={mode}
        stationCode={stationCode}
        showBackButton={false}
        stationInterchanges={stationInterchanges}
        bottomInset={sheetHeight}
        onLineChange={handleLineChange}
        onModeChange={handleModeChange}
        onStationChange={handleStationChange}
        onNearbyStopSelect={handleNearbyStopSelect}
        onUserLocationChange={setPlannerUserLocation}
        plannerEnabled={plannerEnabled}
        plannerOrigin={plannerOrigin}
        plannerDestination={plannerDestination}
        plannerRoutePolylines={selectedRoutePolylines}
        plannerFocusKey={selectedRoute?.id ?? null}
        placeToSave={Boolean(placeToSave)}
        onPlannerToggle={handlePlannerToggle}
        onPlannerMapPress={handlePlannerMapPress}
        onPlaceSaveMapPress={handlePlaceSaveMapPress}
      />

      <LocalBottomSheet
        ref={sheetRef}
        detents={SHEET_DETENTS}
        initialDetentIndex={0}
        onDetentChange={handleDetentChange}
      >
        <View
          style={isCollapsed ? styles.contentHidden : styles.contentVisible}
          pointerEvents={isCollapsed ? 'none' : 'auto'}
        >
          {placeToSave ? (
            <View style={styles.placePrompt}>
              <Text style={styles.placePromptTitle}>
                {t('map_select_place_title', { place: placeToSave === 'home' ? t('saved_home') : t('saved_work') })}
              </Text>
              <Text style={styles.placePromptBody}>{t('map_select_place_body')}</Text>
            </View>
          ) : plannerEnabled ? (
            <PlannerSheet
              origin={plannerOrigin}
              originLabel={plannerOriginLabel}
              destination={plannerDestination}
              destinationLabel={plannerDestinationLabel}
              userLocation={plannerUserLocation}
              activePoint={plannerActivePoint}
              requested={plannerRequested}
              routes={plannedRoutes}
              selectedRouteId={selectedRoute?.id ?? null}
              isLoading={plannedRoutesQuery.isLoading}
              isError={plannedRoutesQuery.isError}
              onActivePointChange={handlePlannerActivePointChange}
              onEdit={() => handlePlannerActivePointChange('destination')}
              onUseCurrentLocation={() => handlePlannerUseCurrentLocation(plannerUserLocation)}
              onPlan={handlePlannerPlan}
              onRouteSelect={(routeId) => {
                setSelectedRouteId(routeId);
                sheetRef.current?.resize(1);
              }}
            />
          ) : (
            <StationContent
              lines={lines}
              stationInterchanges={stationInterchanges}
              active={!isCollapsed}
              onLineStationSelect={handleLineStationSelect}
            />
          )}
        </View>
      </LocalBottomSheet>
    </View>
  );
}

const createStyles = (palette: Palette) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.background,
  },
  contentVisible: {
    flex: 1,
  },
  contentHidden: {
    flex: 0,
    height: 0,
    opacity: 0,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
    gap: 12,
  },
  loadingText: {
    color: palette.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
    paddingHorizontal: 24,
    gap: 8,
  },
  fallbackTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  fallbackText: {
    color: palette.textMuted,
    fontSize: 15,
    textAlign: 'center',
  },
  fallbackButton: {
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: palette.accent,
  },
  fallbackButtonText: {
    color: palette.onAccent,
    fontSize: 15,
    fontWeight: '800',
  },
  placePrompt: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 6,
  },
  placePromptTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800',
  },
  placePromptBody: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
