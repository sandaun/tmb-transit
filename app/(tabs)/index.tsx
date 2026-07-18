import * as Location from 'expo-location';
import { router, useLocalSearchParams, useRootNavigationState } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_CONFIG } from '@/src/config/app-config';
import type { Line, TransportMode } from '@/src/domain/catalog/models';
import { useAllLineStationsQuery } from '@/src/features/catalog/hooks/use-all-line-stations-query';
import {
  fetchAndCacheLineStations,
  useLineStationsQuery,
} from '@/src/features/catalog/hooks/use-line-stations-query';
import {
  fetchAndCacheLines,
  useLinesQuery,
} from '@/src/features/catalog/hooks/use-lines-query';
import { PlannerSheet } from '@/src/features/planner/components/planner-sheet';
import { usePlannedRoutesQuery } from '@/src/features/planner/hooks/use-planned-routes-query';
import { sortPlannedRoutes } from '@/src/features/planner/utils/route-summary';
import {
  buildRouteLandmarks,
  buildRoutePolylines,
  type RouteLandmark,
} from '@/src/features/planner/utils/route-presentation';
import {
  LocalBottomSheet,
  LOCAL_SHEET_MIN_HEIGHT,
  type LocalBottomSheetHandle,
} from '@/src/features/station/components/bottom-sheet/local-bottom-sheet';
import { CollapsedSheetSummary } from '@/src/features/station/components/bottom-sheet/collapsed-sheet-summary';
import { MapScreen } from '@/src/features/station/components/map-screen';
import type { NearbyStop } from '@/src/features/nearby/hooks/use-nearby-stops-query';
import { NearbySheet } from '@/src/features/nearby/components/nearby-sheet';
import { StationContent } from '@/src/features/station/components/station-content';
import { fetchAndCacheLineSegments } from '@/src/features/station/hooks/use-line-segments-query';
import { buildStationInterchanges } from '@/src/features/station/utils/station-interchanges';
import type { SavedPlaceId } from '@/src/features/preferences/models';
import { useUserPreferencesStore } from '@/src/features/preferences/store';
import { useAppLanguage } from '@/src/i18n';
import { useTransitStore } from '@/src/state/store';
import { Text, type Palette, usePalette, useThemedStyles } from '@/src/design-system';
import { useSharedValue } from 'react-native-reanimated';

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

  if (mode === 'fgc') {
    return (lines.find((line) => line.code === 'L6') ?? lines[0]).code;
  }

  return lines[0].code;
}

function reportMapDataError(operation: string, error: unknown): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.error(`[Map] ${operation} failed`, error);
  }
}

const SHEET_DETENTS = [0.1, 0.5, 1] as const;
const NEARBY_SHEET_DETENTS = [0.1, 0.34, 1] as const;
const IOS_NATIVE_TAB_BAR_CLEARANCE = 80;
const ANDROID_NATIVE_TAB_BAR_CLEARANCE = 20;

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
  const rootNavigationState = useRootNavigationState();
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
  const interchangeMode: TransportMode = mode === 'fgc' ? 'metro' : 'fgc';
  const { data: interchangeOperatorLines = [] } = useLinesQuery(
    interchangeMode,
    mode !== 'bus',
  );

  const lineCode =
    (selectedLineCode && lines.some((line) => line.code === selectedLineCode) && selectedLineCode) ||
    pickDefaultLineCode(mode, lines);

  const {
    data: stations = [],
    isLoading: stationsLoading,
    error: stationsError,
    refetch: refetchStations,
  } = useLineStationsQuery(mode, lineCode);
  const interchangeLines = useMemo(
    () => (mode === 'bus' ? [] : [...lines, ...interchangeOperatorLines]),
    [interchangeOperatorLines, lines, mode],
  );
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

  const sheetBottomOffset = insets.bottom + (
    Platform.OS === 'ios'
      ? IOS_NATIVE_TAB_BAR_CLEARANCE
      : ANDROID_NATIVE_TAB_BAR_CLEARANCE
  );
  const sheetRef = useRef<LocalBottomSheetHandle>(null);
  const animatedSheetBottomInset = useSharedValue(
    LOCAL_SHEET_MIN_HEIGHT + sheetBottomOffset,
  );
  const [detentIndex, setDetentIndex] = useState(0);
  const [stationFocusRequestId, setStationFocusRequestId] = useState(0);
  const [pendingMode, setPendingMode] = useState<TransportMode | null>(null);
  const [nearbyEnabled, setNearbyEnabled] = useState(false);
  const [nearbyModes, setNearbyModes] = useState<TransportMode[]>(['metro', 'bus', 'fgc']);
  const [nearbyPanelOpen, setNearbyPanelOpen] = useState(false);
  const [plannerEnabled, setPlannerEnabled] = useState(false);
  const [plannerActivePoint, setPlannerActivePoint] = useState<'origin' | 'destination'>(
    'origin',
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
  const [selectedLegId, setSelectedLegId] = useState<string | null>(null);
  const [plannerStepFocusKey, setPlannerStepFocusKey] = useState(0);
  const [placeToSave, setPlaceToSave] = useState<SavedPlaceId | null>(null);
  const originLabelRequestRef = useRef(0);
  const destinationLabelRequestRef = useRef(0);
  const lineChangeRequestRef = useRef(0);
  const handledRouteIntentRef = useRef<string | null>(null);
  const sheetDetents = nearbyPanelOpen ? NEARBY_SHEET_DETENTS : SHEET_DETENTS;

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
    () => buildRoutePolylines(selectedRoute, palette.accent),
    [palette.accent, selectedRoute],
  );
  const selectedRouteLandmarks = useMemo<RouteLandmark[]>(() => {
    const routeLandmarks = buildRouteLandmarks(selectedRoute).filter(
      (landmark) => landmark.kind !== 'origin' && landmark.kind !== 'destination',
    );
    const endpoints: RouteLandmark[] = [];
    if (plannerOrigin) {
      endpoints.push({
        id: 'origin',
        kind: 'origin',
        name: plannerOriginLabel ?? t('planner_origin'),
        coordinate: plannerOrigin,
        legId: selectedRoute?.legs[0]?.id,
      });
    }
    if (plannerDestination) {
      endpoints.push({
        id: 'destination',
        kind: 'destination',
        name: plannerDestinationLabel ?? t('planner_destination'),
        coordinate: plannerDestination,
        legId: selectedRoute?.legs[selectedRoute.legs.length - 1]?.id,
      });
    }
    return [...endpoints, ...routeLandmarks];
  }, [plannerDestination, plannerDestinationLabel, plannerOrigin, plannerOriginLabel, selectedRoute, t]);
  const focusedStepCoordinate = useMemo(() => {
    if (!selectedLegId || !selectedRoute) return null;
    const landmark = selectedRouteLandmarks.find((item) => item.legId === selectedLegId);
    if (landmark) return landmark.coordinate;
    const leg = selectedRoute.legs.find((item) => item.id === selectedLegId);
    if (leg?.to.lat !== undefined && leg.to.lon !== undefined) {
      return { lat: leg.to.lat, lon: leg.to.lon };
    }
    return null;
  }, [selectedLegId, selectedRoute, selectedRouteLandmarks]);

  const settledSheetBottomInset = useMemo(() => {
    const usableHeight = Math.max(
      LOCAL_SHEET_MIN_HEIGHT,
      windowHeight - Math.max(insets.top, 48) - sheetBottomOffset,
    );
    const detent = sheetDetents[detentIndex] ?? sheetDetents[0];
    const raw = Math.max(LOCAL_SHEET_MIN_HEIGHT, Math.round(usableHeight * detent));
    const maxButtonInset = Math.round(windowHeight * 0.45);
    return Math.min(raw, maxButtonInset) + sheetBottomOffset;
  }, [detentIndex, insets.top, sheetBottomOffset, sheetDetents, windowHeight]);

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
  }, [plannedRoutes, selectedRouteId]);

  const handleDetentChange = useCallback((nextDetentIndex: number) => {
    setDetentIndex(nextDetentIndex);
    if (nextDetentIndex === 0) {
      setNearbyPanelOpen(false);
    }
  }, []);

  const handleNearbyConfigurationPress = useCallback(() => {
    const nextPanelOpen = !nearbyPanelOpen;
    setNearbyPanelOpen(nextPanelOpen);
    sheetRef.current?.resize(nextPanelOpen ? 1 : 0);
  }, [nearbyPanelOpen]);

  const handleNearbyToggle = useCallback(() => {
    const nextEnabled = !nearbyEnabled;
    setNearbyEnabled(nextEnabled);
    if (!nextEnabled) {
      setNearbyPanelOpen(false);
      sheetRef.current?.resize(0);
    }
  }, [nearbyEnabled]);

  const cancelPendingLineChange = useCallback(() => {
    lineChangeRequestRef.current += 1;
    setPendingMode(null);
  }, []);

  const handleModeChange = useCallback(
    (nextMode: TransportMode) => {
      if (nextMode === mode || pendingMode) return;

      const requestId = lineChangeRequestRef.current + 1;
      lineChangeRequestRef.current = requestId;
      setPendingMode(nextMode);
      sheetRef.current?.resize(0);

      void (async () => {
        try {
          const nextLines = await queryClient.fetchQuery({
            queryKey: ['catalog', nextMode, 'lines'] as const,
            queryFn: () => fetchAndCacheLines(nextMode),
            staleTime: APP_CONFIG.catalogTtlMs,
          });
          const nextLineCode = pickDefaultLineCode(nextMode, nextLines);

          if (!nextLineCode) {
            throw new Error(`No ${nextMode} lines available`);
          }

          void queryClient
            .fetchQuery({
              queryKey: ['catalog', nextMode, 'segments', nextLineCode] as const,
              queryFn: () => fetchAndCacheLineSegments(nextMode, nextLineCode),
              staleTime: APP_CONFIG.catalogTtlMs,
            })
            .catch((error: unknown) => {
              reportMapDataError(`loading ${nextMode} ${nextLineCode} geometry`, error);
            });
          const nextStations = await queryClient.fetchQuery({
            queryKey: ['catalog', nextMode, 'stations', nextLineCode] as const,
            queryFn: () => fetchAndCacheLineStations(nextMode, nextLineCode),
            staleTime: APP_CONFIG.catalogTtlMs,
          });
          const nextStationCode = nextStations[0]?.code;

          if (!nextStationCode) {
            throw new Error(`No stations available for ${nextLineCode}`);
          }

          if (lineChangeRequestRef.current === requestId) {
            setSelection(nextMode, nextLineCode, nextStationCode);
            setStationFocusRequestId((focusRequestId) => focusRequestId + 1);
          }
        } catch (error: unknown) {
          if (lineChangeRequestRef.current === requestId) {
            reportMapDataError(`switching to ${nextMode}`, error);
            Alert.alert(t('map_error_title'), t('map_error_body'));
          }
        } finally {
          if (lineChangeRequestRef.current === requestId) {
            setPendingMode(null);
          }
        }
      })();
    },
    [mode, pendingMode, queryClient, setSelection, t],
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
          queryKey: ['catalog', nextMode, 'segments', nextLineCode] as const,
          queryFn: () => fetchAndCacheLineSegments(nextMode, nextLineCode),
          staleTime: APP_CONFIG.catalogTtlMs,
        })
        .catch((error: unknown) => {
          reportMapDataError(`loading ${nextMode} ${nextLineCode} geometry`, error);
        });
      void queryClient
        .fetchQuery({
          queryKey: ['catalog', nextMode, 'stations', nextLineCode] as const,
          queryFn: () => fetchAndCacheLineStations(nextMode, nextLineCode),
          staleTime: APP_CONFIG.catalogTtlMs,
        })
        .then((nextStations) => {
          if (lineChangeRequestRef.current !== requestId) {
            return;
          }

          const nextStationCode = nextStations[0]?.code;
          setSelection(nextMode, nextLineCode, nextStationCode ?? '');

          if (nextStationCode) {
            setStationFocusRequestId((focusRequestId) => focusRequestId + 1);
          }
        })
        .catch((error: unknown) => {
          if (lineChangeRequestRef.current !== requestId) {
            return;
          }

          reportMapDataError(`loading ${nextMode} ${nextLineCode} stations`, error);
          setSelection(nextMode, nextLineCode, '');
        });
    },
    [lineCode, lines, mode, queryClient, setSelection],
  );

  const handleStationChange = useCallback(
    (nextStationCode: string) => {
      if (!lineCode) return;
      cancelPendingLineChange();
      setNearbyPanelOpen(false);
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
      setStationFocusRequestId((requestId) => requestId + 1);
    },
    [addRecentItem, cancelPendingLineChange, lineCode, mode, setSelection, stations],
  );
  const handleLineStationSelect = useCallback(
    (nextMode: TransportMode, nextLineCode: string, nextStationCode: string) => {
      cancelPendingLineChange();
      setSelection(nextMode, nextLineCode, nextStationCode);
      sheetRef.current?.resize(1);
      setStationFocusRequestId((requestId) => requestId + 1);
    },
    [cancelPendingLineChange, setSelection],
  );

  const handleNearbyStopSelect = useCallback(
    (stop: NearbyStop) => {
      cancelPendingLineChange();
      setNearbyPanelOpen(false);
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
      setStationFocusRequestId((requestId) => requestId + 1);
    },
    [addRecentItem, cancelPendingLineChange, lineCode, mode, setSelection],
  );

  const resetPlannerRequest = useCallback(() => {
    setPlannerRequested(false);
    setSelectedRouteId(null);
    setSelectedLegId(null);
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
    const nextPlannerEnabled = !plannerEnabled;
    setPlannerEnabled(nextPlannerEnabled);
    setNearbyPanelOpen(false);

    if (nextPlannerEnabled) {
      setPlannerActivePoint(plannerOrigin ? 'destination' : 'origin');
      sheetRef.current?.resize(1);
    } else {
      resetPlannerRequest();
      sheetRef.current?.resize(0);
    }
  }, [plannerEnabled, plannerOrigin, resetPlannerRequest]);

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

  const handlePlannerSwap = useCallback(() => {
    originLabelRequestRef.current += 1;
    destinationLabelRequestRef.current += 1;
    setPlannerOrigin(plannerDestination);
    setPlannerOriginLabel(plannerDestinationLabel);
    setPlannerDestination(plannerOrigin);
    setPlannerDestinationLabel(plannerOriginLabel);
    setPlannerActivePoint(plannerDestination ? 'destination' : 'origin');
    resetPlannerRequest();
    sheetRef.current?.resize(1);
  }, [
    plannerDestination,
    plannerDestinationLabel,
    plannerOrigin,
    plannerOriginLabel,
    resetPlannerRequest,
  ]);

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

  const handlePlannerRouteSelect = useCallback((routeId: string) => {
    setSelectedRouteId(routeId);
    setSelectedLegId(null);
    sheetRef.current?.resize(2);
  }, []);

  const handlePlannerStepSelect = useCallback((legId: string) => {
    setSelectedLegId(legId);
    setPlannerStepFocusKey((current) => current + 1);
    sheetRef.current?.resize(1);
  }, []);

  const handlePlannerMarkerPress = useCallback((legId: string | undefined) => {
    if (!legId) return;
    setSelectedLegId(legId);
    sheetRef.current?.resize(2);
  }, []);

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
    if (!rootNavigationState?.key) return;
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
  }, [params.originLabel, params.originLat, params.originLon, params.planFrom, resetPlannerRequest, rootNavigationState?.key, savedPlaces, setPlannerPoint]);

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
  const activeLine = lines.find((line) => line.code === lineCode);
  const activeStation = stations.find((station) => station.code === stationCode);
  const collapsedTitle = placeToSave
    ? t('map_select_place_title', {
        place: placeToSave === 'home' ? t('saved_home') : t('saved_work'),
      })
    : plannerEnabled
      ? t('planner_title')
      : activeStation?.name ?? stationCode;
  const collapsedSubtitle = placeToSave
    ? t('map_select_place_body')
    : plannerEnabled
      ? `${plannerOriginLabel ?? t('planner_origin')} → ${plannerDestinationLabel ?? t('planner_destination')}`
      : activeStation?.serviceDescription ?? activeLine?.name ?? lineCode;

  return (
    <View style={styles.root}>
      <MapScreen
        lineCode={lineCode}
        lines={lines}
        mode={mode}
        pendingMode={pendingMode}
        stationCode={stationCode}
        stationFocusRequestId={stationFocusRequestId}
        showBackButton={false}
        stationInterchanges={stationInterchanges}
        bottomInset={settledSheetBottomInset}
        bottomOverlayOffset={sheetBottomOffset}
        animatedBottomInset={animatedSheetBottomInset}
        onLineChange={handleLineChange}
        onModeChange={handleModeChange}
        onStationChange={handleStationChange}
        onNearbyStopSelect={handleNearbyStopSelect}
        nearbyEnabled={nearbyEnabled}
        nearbyModes={nearbyModes}
        onNearbyToggle={handleNearbyToggle}
        onNearbyConfigurationPress={handleNearbyConfigurationPress}
        onUserLocationChange={setPlannerUserLocation}
        plannerEnabled={plannerEnabled}
        plannerOrigin={plannerOrigin}
        plannerOriginLabel={plannerOriginLabel}
        plannerDestination={plannerDestination}
        plannerDestinationLabel={plannerDestinationLabel}
        plannerActivePoint={plannerActivePoint}
        plannerEditing={!plannerRequested}
        plannerLandmarks={selectedRouteLandmarks}
        plannerRoutePolylines={selectedRoutePolylines}
        plannerFocusKey={selectedRoute?.id ?? null}
        plannerStepFocus={
          focusedStepCoordinate
            ? {
                key: `${selectedLegId ?? 'step'}:${plannerStepFocusKey}`,
                coordinate: focusedStepCoordinate,
              }
            : null
        }
        selectedPlannerLegId={selectedLegId}
        placeToSave={Boolean(placeToSave)}
        onPlannerToggle={handlePlannerToggle}
        onPlannerMapPress={handlePlannerMapPress}
        onPlannerMarkerPress={handlePlannerMarkerPress}
        onPlaceSaveMapPress={handlePlaceSaveMapPress}
      />

      <LocalBottomSheet
        ref={sheetRef}
        detents={sheetDetents}
        initialDetentIndex={0}
        bottomOffset={sheetBottomOffset}
        animatedBottomInset={animatedSheetBottomInset}
        onDetentChange={handleDetentChange}
      >
        {isCollapsed ? (
          <CollapsedSheetSummary
            title={collapsedTitle}
            subtitle={collapsedSubtitle}
            line={
              !placeToSave && !plannerEnabled
                ? {
                    code: lineCode,
                    mode,
                    color: activeLine?.color,
                  }
                : undefined
            }
            icon={placeToSave ? 'add-location-alt' : 'route'}
            onPress={() => sheetRef.current?.resize(1)}
          />
        ) : (
          <View style={styles.contentVisible}>
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
                selectedLegId={selectedLegId}
                isExpanded={detentIndex === 2}
                isLoading={plannedRoutesQuery.isFetching}
                isError={plannedRoutesQuery.isError}
                onActivePointChange={handlePlannerActivePointChange}
                onSwap={handlePlannerSwap}
                onUseCurrentLocation={() => handlePlannerUseCurrentLocation(plannerUserLocation)}
                onPlan={handlePlannerPlan}
                onRetry={() => void plannedRoutesQuery.refetch()}
                onRouteSelect={handlePlannerRouteSelect}
                onStepSelect={handlePlannerStepSelect}
              />
            ) : nearbyPanelOpen ? (
              <NearbySheet
                activeModes={nearbyModes}
                onModesChange={setNearbyModes}
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
        )}
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
