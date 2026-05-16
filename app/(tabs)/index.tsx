import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Line, TransportMode } from '@/src/domain/catalog/models';
import { useAllLineStationsQuery } from '@/src/features/catalog/hooks/use-all-line-stations-query';
import { useLineStationsQuery } from '@/src/features/catalog/hooks/use-line-stations-query';
import { useLinesQuery } from '@/src/features/catalog/hooks/use-lines-query';
import { PlannerSheet } from '@/src/features/planner/components/planner-sheet';
import { usePlannedRoutesQuery } from '@/src/features/planner/hooks/use-planned-routes-query';
import {
  LocalBottomSheet,
  type LocalBottomSheetHandle,
} from '@/src/features/station/components/bottom-sheet/local-bottom-sheet';
import { MapScreen } from '@/src/features/station/components/map-screen';
import type { NearbyStop } from '@/src/features/nearby/hooks/use-nearby-stops-query';
import type { PlannedLeg, PlannedRoute } from '@/src/domain/planner/models';
import { StationContent } from '@/src/features/station/components/station-content';
import { buildStationInterchanges } from '@/src/features/station/utils/station-interchanges';
import { useTransitStore } from '@/src/state/store';

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

function getRoutePoints(route: PlannedRoute | null): { lat: number; lon: number }[] {
  if (!route) {
    return [];
  }
  return route.legs.flatMap(getLegPoints);
}

export default function MapTabScreen() {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const mode = useTransitStore((s) => s.selectedMode);
  const selectedLineCode = useTransitStore((s) => s.selectedLineCode);
  const selectedStationCode = useTransitStore((s) => s.selectedStationCode);
  const setSelection = useTransitStore((s) => s.setSelection);

  const {
    data: lines = [],
    isLoading: linesLoading,
    error: linesError,
  } = useLinesQuery(mode);

  const lineCode =
    (selectedLineCode && lines.some((line) => line.code === selectedLineCode) && selectedLineCode) ||
    pickDefaultLineCode(mode, lines);

  const {
    data: stations = [],
    isLoading: stationsLoading,
    error: stationsError,
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
  const [plannerDestination, setPlannerDestination] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const [plannerUserLocation, setPlannerUserLocation] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const [plannerRequested, setPlannerRequested] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const plannedRoutesQuery = usePlannedRoutesQuery(plannerOrigin, plannerDestination, {
    enabled: plannerEnabled && plannerRequested,
  });
  const plannedRoutes = useMemo(
    () => plannedRoutesQuery.data ?? [],
    [plannedRoutesQuery.data],
  );
  const selectedRoute =
    plannedRoutes.find((route) => route.id === selectedRouteId) ?? plannedRoutes[0] ?? null;
  const selectedRoutePoints = useMemo(() => getRoutePoints(selectedRoute), [selectedRoute]);

  const sheetHeight = useMemo(() => {
    const usableHeight = Math.max(0, windowHeight - Math.max(insets.top, 48));
    const detent = SHEET_DETENTS[detentIndex] ?? SHEET_DETENTS[0];
    const raw = Math.max(116, Math.round(usableHeight * detent));
    const maxButtonInset = Math.round(windowHeight * 0.45);
    return Math.min(raw, maxButtonInset);
  }, [detentIndex, insets.top, windowHeight]);

  useEffect(() => {
    if (!lineCode || !stationCode) {
      return;
    }

    if (
      selectedLineCode === lineCode &&
      selectedStationCode === stationCode
    ) {
      return;
    }

    setSelection(mode, lineCode, stationCode);
  }, [
    lineCode,
    mode,
    selectedLineCode,
    selectedStationCode,
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
      sheetRef.current?.resize(2);
    }
  }, [plannedRoutes, plannerEnabled, plannerRequested, selectedRouteId]);

  const handleDetentChange = useCallback((nextDetentIndex: number) => {
    setDetentIndex(nextDetentIndex);
  }, []);

  const handleModeChange = useCallback(
    (nextMode: TransportMode) => {
      if (nextMode === mode) return;
      setSelection(nextMode, '', '');
      sheetRef.current?.resize(0);
    },
    [mode, setSelection],
  );

  const handleLineChange = useCallback(
    (nextLineCode: string) => {
      const nextLine = lines.find((line) => line.code === nextLineCode);
      setSelection(nextLine?.mode ?? mode, nextLineCode, '');
      sheetRef.current?.resize(0);
    },
    [lines, mode, setSelection],
  );

  const handleStationChange = useCallback(
    (nextStationCode: string) => {
      if (!lineCode) return;
      setSelection(mode, lineCode, nextStationCode);
      sheetRef.current?.resize(1);
    },
    [lineCode, mode, setSelection],
  );
  const handleLineStationSelect = useCallback(
    (nextMode: TransportMode, nextLineCode: string, nextStationCode: string) => {
      setSelection(nextMode, nextLineCode, nextStationCode);
      sheetRef.current?.resize(1);
    },
    [setSelection],
  );

  const handleNearbyStopSelect = useCallback(
    (stop: NearbyStop) => {
      const effectiveLineCode =
        stop.lineCode || (stop.mode === mode ? lineCode : '') || '';
      setSelection(stop.mode, effectiveLineCode, stop.code);
      sheetRef.current?.resize(1);
    },
    [lineCode, mode, setSelection],
  );

  const resetPlannerRequest = useCallback(() => {
    setPlannerRequested(false);
    setSelectedRouteId(null);
  }, []);

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
      if (plannerActivePoint === 'origin') {
        setPlannerOrigin(coordinate);
        setPlannerActivePoint('destination');
      } else {
        setPlannerDestination(coordinate);
      }
      resetPlannerRequest();
      sheetRef.current?.resize(1);
    },
    [plannerActivePoint, resetPlannerRequest],
  );

  const handlePlannerUseCurrentLocation = useCallback(
    (coordinate: { lat: number; lon: number } | null) => {
      if (!coordinate) {
        return;
      }
      setPlannerOrigin(coordinate);
      setPlannerActivePoint('destination');
      resetPlannerRequest();
      sheetRef.current?.resize(1);
    },
    [resetPlannerRequest],
  );

  const handlePlannerPlan = useCallback(() => {
    if (!plannerOrigin || !plannerDestination) {
      return;
    }
    setPlannerRequested(true);
    sheetRef.current?.resize(2);
  }, [plannerDestination, plannerOrigin]);

  if (linesError || stationsError) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>Map data could not be loaded.</Text>
        <Text style={styles.fallbackText}>
          Check the API connection and try again.
        </Text>
      </View>
    );
  }

  if (linesLoading || stationsLoading || !lineCode || !stationCode) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2A70FF" />
        <Text style={styles.loadingText}>Preparing live map...</Text>
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
        plannerRoutePoints={selectedRoutePoints}
        onPlannerToggle={handlePlannerToggle}
        onPlannerMapPress={handlePlannerMapPress}
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
          {plannerEnabled ? (
            <PlannerSheet
              origin={plannerOrigin}
              destination={plannerDestination}
              userLocation={plannerUserLocation}
              activePoint={plannerActivePoint}
              requested={plannerRequested}
              routes={plannedRoutes}
              selectedRouteId={selectedRoute?.id ?? null}
              isLoading={plannedRoutesQuery.isLoading}
              isError={plannedRoutesQuery.isError}
              onActivePointChange={setPlannerActivePoint}
              onUseCurrentLocation={() => handlePlannerUseCurrentLocation(plannerUserLocation)}
              onPlan={handlePlannerPlan}
              onRouteSelect={(routeId) => {
                setSelectedRouteId(routeId);
                sheetRef.current?.resize(2);
              }}
            />
          ) : (
            <StationContent
              lines={lines}
              stationInterchanges={stationInterchanges}
              onLineStationSelect={handleLineStationSelect}
            />
          )}
        </View>
      </LocalBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#09111E',
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
    backgroundColor: '#09111E',
    gap: 12,
  },
  loadingText: {
    color: '#D7E5FF',
    fontSize: 16,
    fontWeight: '600',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#09111E',
    paddingHorizontal: 24,
    gap: 8,
  },
  fallbackTitle: {
    color: '#F4F8FF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  fallbackText: {
    color: '#AABBDC',
    fontSize: 15,
    textAlign: 'center',
  },
});
