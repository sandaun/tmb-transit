import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  MapAdapter,
  type PlannerMapMarker,
  type PlannerMapPolyline,
} from '@/src/features/station/components/map-adapter';
import { ModeToggle } from '@/src/features/station/components/mode-toggle';
import { FamilyFilter } from '@/src/features/station/components/family-filter';
import { SearchShell } from '@/src/features/station/components/search-shell';
import { NearbyControl } from '@/src/features/nearby/components/nearby-control';
import { RouteControl } from '@/src/features/planner/components/route-control';
import {
  useNearbyStopsQuery,
  type NearbyStop,
} from '@/src/features/nearby/hooks/use-nearby-stops-query';
import type { Line, TransportMode } from '@/src/domain/catalog/models';
import {
  filterLinesByFamily,
  getBusLineFamily,
  listAvailableFamilies,
  type BusLineFamily,
} from '@/src/features/catalog/utils/bus-line-family';
import { useLineStationsQuery } from '@/src/features/catalog/hooks/use-line-stations-query';
import { useLineSegmentsQuery } from '@/src/features/station/hooks/use-line-segments-query';
import type { StationInterchange } from '@/src/features/station/utils/station-interchanges';

interface MapScreenProps {
  lineCode: string;
  lines?: Line[];
  mode: TransportMode;
  stationCode: string;
  showBackButton?: boolean;
  stationInterchanges?: StationInterchange[];
  bottomInset?: number;
  onLineChange?: (lineCode: string) => void;
  onModeChange?: (mode: TransportMode) => void;
  onStationChange?: (stationCode: string) => void;
  onNearbyStopSelect?: (stop: NearbyStop) => void;
  onUserLocationChange?: (coordinate: { lat: number; lon: number } | null) => void;
  plannerEnabled?: boolean;
  plannerOrigin?: { lat: number; lon: number } | null;
  plannerDestination?: { lat: number; lon: number } | null;
  plannerRoutePolylines?: PlannerMapPolyline[];
  plannerFocusKey?: string | null;
  onPlannerToggle?: () => void;
  onPlannerMapPress?: (coordinate: { lat: number; lon: number }) => void;
}

const NEARBY_RADIUS_METERS = 500;

export function MapScreen({
  lineCode,
  lines,
  mode,
  stationCode,
  showBackButton = true,
  stationInterchanges,
  bottomInset = 0,
  onLineChange,
  onModeChange,
  onStationChange,
  onNearbyStopSelect,
  onUserLocationChange,
  plannerEnabled = false,
  plannerOrigin = null,
  plannerDestination = null,
  plannerRoutePolylines = [],
  plannerFocusKey = null,
  onPlannerToggle,
  onPlannerMapPress,
}: MapScreenProps) {
  const insets = useSafeAreaInsets();
  const [nearbyEnabled, setNearbyEnabled] = useState(false);
  const [nearbyModes, setNearbyModes] = useState<TransportMode[]>(['metro', 'bus']);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const explorationVisible = !plannerEnabled;

  const stationsQuery = useLineStationsQuery(mode, lineCode);
  const segmentsQuery = useLineSegmentsQuery(mode, lineCode);
  const stations = useMemo(() => stationsQuery.data ?? [], [stationsQuery.data]);

  const [busFamily, setBusFamily] = useState<BusLineFamily | null>(null);
  const lastSyncedLineCodeRef = useRef<string | null>(null);

  // Reset the family filter when leaving bus mode.
  useEffect(() => {
    if (mode !== 'bus') {
      setBusFamily(null);
      lastSyncedLineCodeRef.current = null;
    }
  }, [mode]);

  // When the active line changes externally to one that is not visible under the
  // current family filter, switch to its family so the user can still see it.
  // Importantly, this never fires when the user is the one toggling the filter.
  useEffect(() => {
    if (mode !== 'bus' || !lineCode) {
      lastSyncedLineCodeRef.current = lineCode ?? null;
      return;
    }

    if (lastSyncedLineCodeRef.current === lineCode) {
      return;
    }
    lastSyncedLineCodeRef.current = lineCode;

    if (busFamily === null) {
      return;
    }

    const family = getBusLineFamily(lineCode);
    if (family !== busFamily) {
      setBusFamily(family);
    }
  }, [busFamily, lineCode, mode]);

  const availableFamilies = useMemo(
    () => (mode === 'bus' ? listAvailableFamilies(lines ?? []) : []),
    [lines, mode],
  );

  const visibleLines = useMemo(() => {
    if (mode !== 'bus' || !lines) {
      return lines ?? [];
    }
    return filterLinesByFamily(lines, busFamily);
  }, [busFamily, lines, mode]);

  const activeLine = useMemo(
    () => lines?.find((line) => line.code === lineCode),
    [lineCode, lines],
  );

  const nearbyQuery = useNearbyStopsQuery(userLocation, {
    modes: nearbyModes,
    radiusMeters: NEARBY_RADIUS_METERS,
    enabled: nearbyEnabled && explorationVisible,
  });

  const activeStationCodes = useMemo(
    () => new Set(stations.map((s) => s.code)),
    [stations],
  );

  const nearbyMarkers = useMemo(() => {
    if (!nearbyEnabled || !explorationVisible) {
      return [];
    }
    return (nearbyQuery.data ?? [])
      .filter((stop) => !(stop.mode === mode && activeStationCodes.has(stop.code)))
      .map((stop) => ({
        code: stop.code,
        lineCode: stop.lineCode,
        lineColor: stop.lineColor,
        name: stop.name,
        lat: stop.lat,
        lon: stop.lon,
        mode: stop.mode,
      }));
  }, [activeStationCodes, explorationVisible, mode, nearbyEnabled, nearbyQuery.data]);

  const plannerMarkers = useMemo<PlannerMapMarker[]>(() => {
    if (!plannerEnabled) {
      return [];
    }
    const markers: PlannerMapMarker[] = [];
    if (plannerOrigin) {
      markers.push({
        id: 'origin',
        label: 'A',
        coordinate: plannerOrigin,
        kind: 'origin',
      });
    }
    if (plannerDestination) {
      markers.push({
        id: 'destination',
        label: 'B',
        coordinate: plannerDestination,
        kind: 'destination',
      });
    }
    return markers;
  }, [plannerDestination, plannerEnabled, plannerOrigin]);

  const plannerPolylines = useMemo<PlannerMapPolyline[]>(() => {
    if (!plannerEnabled) {
      return [];
    }
    return plannerRoutePolylines;
  }, [plannerEnabled, plannerRoutePolylines]);

  const handleNearbyTogglePress = useCallback(() => {
    setNearbyEnabled((current) => !current);
  }, []);

  const handleNearbyStopPress = useCallback(
    (stop: { code: string; mode: TransportMode }) => {
      const match = (nearbyQuery.data ?? []).find(
        (candidate) => candidate.code === stop.code && candidate.mode === stop.mode,
      );
      if (!match) return;

      if (
        match.mode === mode &&
        stations.some((station) => station.code === match.code)
      ) {
        onStationChange?.(match.code);
      }

      onNearbyStopSelect?.(match);
    },
    [mode, nearbyQuery.data, onNearbyStopSelect, onStationChange, stations],
  );

  const handleStationPress = useCallback(
    (nextStationCode: string) => {
      if (!nextStationCode) return;
      onStationChange?.(nextStationCode);
    },
    [onStationChange],
  );

  const handleMapPress = useCallback(
    (coordinate: { lat: number; lon: number }) => {
      if (!plannerEnabled) {
        return;
      }
      onPlannerMapPress?.(coordinate);
    },
    [onPlannerMapPress, plannerEnabled],
  );

  const handleUserLocationChange = useCallback(
    (coordinate: { lat: number; lon: number } | null) => {
      setUserLocation(coordinate);
      onUserLocationChange?.(coordinate);
    },
    [onUserLocationChange],
  );

  const showFamilyFilter = mode === 'bus' && availableFamilies.length > 0;
  return (
    <View style={styles.root}>
      <MapAdapter
        lineCode={lineCode}
        lineColor={activeLine?.color}
        mode={mode}
        stations={stations}
        segments={segmentsQuery.data ?? []}
        selectedStationCode={stationCode}
        stationInterchanges={stationInterchanges}
        isRouteLoading={segmentsQuery.isLoading}
        bottomInset={bottomInset}
        nearbyStops={nearbyMarkers}
        plannerMarkers={plannerMarkers}
        plannerPolylines={plannerPolylines}
        plannerFocusKey={plannerFocusKey}
        explorationVisible={explorationVisible}
        bottomActions={
          showBackButton ? null : (
            <>
              <RouteControl enabled={plannerEnabled} onPress={onPlannerToggle ?? (() => undefined)} />
              {explorationVisible ? (
                <NearbyControl
                  enabled={nearbyEnabled}
                  activeModes={nearbyModes}
                  onToggle={handleNearbyTogglePress}
                  onModesChange={setNearbyModes}
                />
              ) : null}
            </>
          )
        }
        onStationPress={handleStationPress}
        onUserLocationChange={handleUserLocationChange}
        onNearbyStopPress={handleNearbyStopPress}
        onMapPress={handleMapPress}
      />

      {showBackButton || explorationVisible ? (
        <View style={[styles.topOverlay, { top: insets.top + 8 }]}>
          {showBackButton ? (
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>{'<'}</Text>
            </Pressable>
          ) : (
            <View style={styles.controls}>
              {onModeChange ? (
                <ModeToggle mode={mode} onChange={onModeChange} />
              ) : null}
              {showFamilyFilter ? (
                <FamilyFilter
                  available={availableFamilies}
                  selected={busFamily}
                  onChange={setBusFamily}
                />
              ) : null}
              <SearchShell
                lineCode={lineCode}
                lines={visibleLines}
                mode={mode}
                onLineChange={onLineChange}
              />
            </View>
          )}
        </View>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
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
  controls: {
    gap: 8,
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
});
