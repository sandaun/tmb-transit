import * as Location from 'expo-location';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type ImageRequireSource,
} from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import MapView, {
  Callout,
  Marker,
  Polyline,
  type LatLng,
  type MapPressEvent,
  type Region,
  type UserLocationChangeEvent,
} from 'react-native-maps';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppLanguage } from '@/src/i18n';
import type { Line, Station, TransportMode } from '@/src/domain/catalog/models';
import type { Segment } from '@/src/domain/geo/models';
import type { TransitVehicle } from '@/src/domain/realtime/models';
import { getLineBrand } from '@/src/features/catalog/utils/line-brand';
import {
  getPlannerRouteMode,
  type RouteLandmarkKind,
} from '@/src/features/planner/utils/route-presentation';
import {
  getUniqueInterchangeLines,
  prioritizeSelectedInterchangeLine,
  type StationInterchange,
} from '@/src/features/station/utils/station-interchanges';
import { getMapMarkerDetail } from '@/src/features/station/utils/map-marker-detail';
import { getViewportFocusedRegion } from '@/src/features/station/utils/map-camera';
import { Text, type Palette, usePalette, useThemedStyles } from '@/src/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface NearbyStopMarker {
  code: string;
  lineCode: string;
  lineColor?: string;
  name: string;
  lat: number;
  lon: number;
  mode: TransportMode;
}

export interface PlannerMapMarker {
  id: string;
  label: string;
  name: string;
  coordinate: { lat: number; lon: number };
  kind: RouteLandmarkKind;
  legId?: string;
  incomingRoute?: string;
  outgoingRoute?: string;
  incomingMode?: TransportMode;
  outgoingMode?: TransportMode;
  selected?: boolean;
  accessibilityLabel: string;
}

export interface PlannerMapPolyline {
  id: string;
  points: { lat: number; lon: number }[];
  color: string;
}

interface MapAdapterProps {
  lineCode: string;
  lineColor?: string;
  mode: TransportMode;
  stations: Station[];
  segments: Segment[];
  transitVehicles?: TransitVehicle[];
  selectedStationCode: string;
  stationFocusRequestId?: number;
  stationInterchanges?: StationInterchange[];
  topInset?: number;
  bottomInset?: number;
  bottomOverlayOffset?: number;
  animatedBottomInset?: SharedValue<number>;
  nearbyStops?: NearbyStopMarker[];
  plannerMarkers?: PlannerMapMarker[];
  plannerPolylines?: PlannerMapPolyline[];
  plannerFocusKey?: string | null;
  plannerStepFocus?: { key: string; coordinate: { lat: number; lon: number } } | null;
  explorationVisible?: boolean;
  bottomActions?: React.ReactNode;
  onStationPress: (stationCode: string) => void;
  onUserLocationChange?: (coordinate: { lat: number; lon: number } | null) => void;
  onNearbyStopPress?: (stop: NearbyStopMarker) => void;
  onMapPress?: (coordinate: { lat: number; lon: number }) => void;
  onPlannerMarkerPress?: (legId: string | undefined) => void;
}

interface RoutePolyline {
  id: string;
  coordinates: LatLng[];
}

function toMapCoordinate(point: { lat: number; lon: number }): LatLng {
  return {
    latitude: point.lat,
    longitude: point.lon,
  };
}

function hasFiniteCoordinate(coordinate: LatLng): boolean {
  return Number.isFinite(coordinate.latitude) && Number.isFinite(coordinate.longitude);
}

function withAlpha(color: string, alpha: number): string {
  const normalized = color.trim();
  const hex = normalized.match(/^#?([0-9A-Fa-f]{6})$/)?.[1];
  if (!hex) {
    return normalized;
  }

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getFallbackPolyline(stations: Station[]): RoutePolyline | null {
  const coordinates = stations
    .map((station) => ({
      latitude: station.lat,
      longitude: station.lon,
    }))
    .filter(hasFiniteCoordinate);

  if (coordinates.length < 2) {
    return null;
  }

  return {
    id: 'stations',
    coordinates,
  };
}

const USER_LOCATION_TIMEOUT_MS = 10_000;
const MAP_CENTER_ANIMATION_MS = 450;
const STATION_MARKER_ANCHOR = { x: 0.5, y: 0.5 };
const STATION_MARKER_CENTER_OFFSET = { x: 0, y: 0 };
const STATION_BADGE_ANCHOR = { x: 0, y: 1 };
const STATION_NAME_ANCHOR = { x: 0.5, y: 0 };
const STATION_NAME_CENTER_OFFSET = { x: 0, y: 26 };
const STATION_MARKER_IMAGE = require('@/assets/map/station-marker-large.png') as ImageRequireSource;
const SELECTED_STATION_MARKER_IMAGES: Record<string, ImageRequireSource> = {
  L1: require('@/assets/map/station-marker-selected-large-l1.png') as ImageRequireSource,
  L2: require('@/assets/map/station-marker-selected-large-l2.png') as ImageRequireSource,
  L3: require('@/assets/map/station-marker-selected-large-l3.png') as ImageRequireSource,
  L4: require('@/assets/map/station-marker-selected-large-l4.png') as ImageRequireSource,
  L5: require('@/assets/map/station-marker-selected-large-l5.png') as ImageRequireSource,
  L9N: require('@/assets/map/station-marker-selected-large-l9.png') as ImageRequireSource,
  L9S: require('@/assets/map/station-marker-selected-large-l9.png') as ImageRequireSource,
  L10N: require('@/assets/map/station-marker-selected-large-l10.png') as ImageRequireSource,
  L10S: require('@/assets/map/station-marker-selected-large-l10.png') as ImageRequireSource,
  L11: require('@/assets/map/station-marker-selected-large-l11.png') as ImageRequireSource,
  FM: require('@/assets/map/station-marker-selected-large-fm.png') as ImageRequireSource,
};
const FALLBACK_SELECTED_STATION_MARKER_IMAGE = require('@/assets/map/station-marker-selected-large-fallback.png') as ImageRequireSource;

function getStationMarkerImage(lineLabel: string, isSelected: boolean): ImageRequireSource {
  if (!isSelected) {
    return STATION_MARKER_IMAGE;
  }

  return SELECTED_STATION_MARKER_IMAGES[lineLabel] ?? FALLBACK_SELECTED_STATION_MARKER_IMAGE;
}

export function MapAdapter({
  lineCode,
  lineColor,
  mode,
  stations,
  segments,
  transitVehicles = [],
  selectedStationCode,
  stationFocusRequestId = 0,
  stationInterchanges = [],
  topInset = 0,
  bottomInset = 0,
  bottomOverlayOffset = 0,
  animatedBottomInset,
  nearbyStops = [],
  plannerMarkers = [],
  plannerPolylines = [],
  plannerFocusKey = null,
  plannerStepFocus = null,
  explorationVisible = true,
  bottomActions,
  onStationPress,
  onUserLocationChange,
  onNearbyStopPress,
  onMapPress,
  onPlannerMarkerPress,
}: MapAdapterProps) {
  const colorScheme = useColorScheme();
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);
  const { t } = useAppLanguage();
  const mapRef = useRef<MapView | null>(null);
  const currentRegionRef = useRef<Region | null>(null);
  const lastStationFocusRequestRef = useRef(0);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapHeight, setMapHeight] = useState(0);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isWaitingForUserLocation, setIsWaitingForUserLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const locationMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomControlsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: -(animatedBottomInset?.get() ?? bottomInset),
      },
    ],
  }));

  useEffect(() => {
    if (locationMessageTimerRef.current) {
      clearTimeout(locationMessageTimerRef.current);
      locationMessageTimerRef.current = null;
    }
    if (locationMessage) {
      locationMessageTimerRef.current = setTimeout(() => {
        setLocationMessage(null);
      }, 3_000);
    }
    return () => {
      if (locationMessageTimerRef.current) {
        clearTimeout(locationMessageTimerRef.current);
      }
    };
  }, [locationMessage]);

  const shouldCenterOnNextUserLocationRef = useRef(false);
  const lastPlannerFocusKeyRef = useRef<string | null>(null);
  const lastPlannerStepFocusKeyRef = useRef<string | null>(null);
  const userLocationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userCoordinate, setUserCoordinate] = useState<LatLng | null>(null);
  const [latitudeDelta, setLatitudeDelta] = useState(0.05);
  const selectedStation = stations.find(
    (station) => station.code === selectedStationCode,
  );
  const lineBrand = getLineBrand(mode, lineCode, lineColor);

  const handleRegionChangeComplete = useCallback((region: Region) => {
    currentRegionRef.current = region;
    setLatitudeDelta(region.latitudeDelta);
  }, []);

  const initialRegion = useMemo(() => {
    const center = selectedStation ?? stations[0];

    if (!center) {
      return {
        latitude: 41.3851,
        longitude: 2.1734,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }

    return {
      latitude: center.lat,
      longitude: center.lon,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, [selectedStation, stations]);

  useEffect(() => {
    let isMounted = true;

    Location.getForegroundPermissionsAsync()
      .then(({ status }) => {
        if (isMounted) {
          setHasLocationPermission(status === 'granted');
        }
      })
      .catch(() => {
        if (isMounted) {
          setHasLocationPermission(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (userLocationTimeoutRef.current) {
        clearTimeout(userLocationTimeoutRef.current);
      }
    },
    [],
  );

  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const isGranted = status === 'granted';
      setHasLocationPermission(isGranted);
      return isGranted;
    } catch {
      setHasLocationPermission(false);
      return false;
    }
  }, []);

  const visibleStations = useMemo(
    () => {
      if (!explorationVisible) {
        return [];
      }

      return stations.filter(
        (station) => Number.isFinite(station.lat) && Number.isFinite(station.lon),
      );
    },
    [explorationVisible, stations],
  );

  const namedStations = useMemo(() => {
    if (visibleStations.length === 0) {
      return [];
    }

    // Bus lines have many more stops and short distances between them,
    // so we keep all-names off until the user is very zoomed in.
    const showAllThreshold = mode === 'bus' ? 0.012 : 0.04;
    const showEveryThreshold = mode === 'bus' ? 0.025 : 0.08;
    const showAll = latitudeDelta <= showAllThreshold;
    const showEvery = latitudeDelta <= showEveryThreshold ? 3 : 0;
    const result = new Map<string, (typeof visibleStations)[number]>();

    // Always show terminals.
    result.set(visibleStations[0].code, visibleStations[0]);
    result.set(
      visibleStations[visibleStations.length - 1].code,
      visibleStations[visibleStations.length - 1],
    );

    // Always show selected station.
    if (selectedStation) {
      result.set(selectedStation.code, selectedStation);
    }

    if (showAll) {
      for (const station of visibleStations) {
        result.set(station.code, station);
      }
    } else if (showEvery > 0) {
      for (let index = 0; index < visibleStations.length; index += showEvery) {
        const station = visibleStations[index];
        result.set(station.code, station);
      }
    }

    return Array.from(result.values());
  }, [latitudeDelta, mode, selectedStation, visibleStations]);

  // Keep Apple Maps' logo, wordmark, and "Legal" link visible. Attached sheets
  // place them above the collapsed surface; detached sheets use the gap between
  // the surface and the native tab bar. Required by Apple's MapKit terms.
  const COLLAPSED_ATTACHED_SHEET_HEIGHT = 100;
  const DETACHED_ATTRIBUTION_CLEARANCE = 16;
  const attributionBottomInset = bottomOverlayOffset > 0
    ? Math.max(0, bottomOverlayOffset - DETACHED_ATTRIBUTION_CLEARANCE)
    : Math.min(bottomInset, COLLAPSED_ATTACHED_SHEET_HEIGHT);
  const mapPadding = useMemo(
    () => ({ top: 0, right: 0, bottom: attributionBottomInset, left: 0 }),
    [attributionBottomInset],
  );

  const legalLabelInsets = useMemo(
    () => ({ bottom: attributionBottomInset, left: 70, right: 0, top: 0 }),
    [attributionBottomInset],
  );
  const appleLogoInsets = useMemo(
    () => ({
      bottom: bottomOverlayOffset > 0
        ? Math.max(0, attributionBottomInset - 12)
        : attributionBottomInset,
      left: 8,
      right: 0,
      top: 0,
    }),
    [attributionBottomInset, bottomOverlayOffset],
  );
  const markerDetail = getMapMarkerDetail(latitudeDelta);
  const interchangeByStationKey = useMemo(() => {
    const nextInterchangeByStationKey = new Map<string, StationInterchange>();

    stationInterchanges.forEach((interchange) => {
      interchange.members.forEach((member) => {
        nextInterchangeByStationKey.set(
          `${member.line.code}:${member.station.code}`,
          interchange,
        );
      });
    });

    return nextInterchangeByStationKey;
  }, [stationInterchanges]);
  const badgeStations = useMemo(
    () =>
      visibleStations.filter((station) => {
        const interchange = interchangeByStationKey.get(`${lineCode}:${station.code}`);
        const isSelected = station.code === selectedStationCode;
        return (
          (interchange?.members.length ?? 1) > 1 &&
          (isSelected || markerDetail !== 'minimal')
        );
      }),
    [interchangeByStationKey, lineCode, markerDetail, selectedStationCode, visibleStations],
  );

  const centerMap = useCallback((coordinate: LatLng, delta = 0.05) => {
    mapRef.current?.animateToRegion(
      {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        latitudeDelta: delta,
        longitudeDelta: delta,
      },
      MAP_CENTER_ANIMATION_MS,
    );
  }, []);

  const stopWaitingForUserLocation = useCallback((message: string | null) => {
    shouldCenterOnNextUserLocationRef.current = false;
    setIsWaitingForUserLocation(false);
    setLocationMessage(message);

    if (userLocationTimeoutRef.current) {
      clearTimeout(userLocationTimeoutRef.current);
      userLocationTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (
      stationFocusRequestId === 0 ||
      stationFocusRequestId === lastStationFocusRequestRef.current ||
      !explorationVisible ||
      !selectedStation ||
      !isMapReady ||
      mapHeight <= 0
    ) {
      return;
    }

    lastStationFocusRequestRef.current = stationFocusRequestId;
    const currentRegion = currentRegionRef.current ?? {
      latitude: selectedStation.lat,
      longitude: selectedStation.lon,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
    const focusedRegion = getViewportFocusedRegion(
      {
        latitude: selectedStation.lat,
        longitude: selectedStation.lon,
      },
      currentRegion,
      {
        height: mapHeight,
        topInset,
        bottomInset,
      },
    );

    mapRef.current?.animateToRegion(focusedRegion, MAP_CENTER_ANIMATION_MS);
  }, [
    bottomInset,
    explorationVisible,
    isMapReady,
    mapHeight,
    selectedStation,
    stationFocusRequestId,
    topInset,
  ]);

  useEffect(() => {
    if (!plannerFocusKey) {
      lastPlannerFocusKeyRef.current = null;
      return;
    }

    if (!isMapReady || plannerFocusKey === lastPlannerFocusKeyRef.current) {
      return;
    }

    const points = [
      ...plannerPolylines
      .flatMap((polyline) => polyline.points)
      .filter(
        (point) => Number.isFinite(point.lat) && Number.isFinite(point.lon),
      ),
      ...plannerMarkers.map((marker) => marker.coordinate),
    ];
    if (points.length < 2) {
      return;
    }

    lastPlannerFocusKeyRef.current = plannerFocusKey;
    mapRef.current?.fitToCoordinates(points.map(toMapCoordinate), {
      animated: true,
      edgePadding: {
        top: 80,
        right: 56,
        bottom: Math.max(140, bottomInset + 32),
        left: 56,
      },
    });
  }, [bottomInset, isMapReady, plannerFocusKey, plannerMarkers, plannerPolylines]);

  useEffect(() => {
    if (!plannerStepFocus) {
      lastPlannerStepFocusKeyRef.current = null;
      return;
    }
    if (
      !isMapReady ||
      plannerStepFocus.key === lastPlannerStepFocusKeyRef.current
    ) {
      return;
    }
    lastPlannerStepFocusKeyRef.current = plannerStepFocus.key;
    centerMap(toMapCoordinate(plannerStepFocus.coordinate), 0.018);
  }, [centerMap, isMapReady, plannerStepFocus]);

  const handleStationPress = useCallback(
    (stationCode: string) => {
      onStationPress(stationCode);
    },
    [onStationPress],
  );

  const handleUserLocationChange = useCallback(
    (event: UserLocationChangeEvent) => {
      const coordinate = event.nativeEvent.coordinate;

      if (!coordinate) {
        return;
      }

      setUserCoordinate({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      });
      onUserLocationChange?.({ lat: coordinate.latitude, lon: coordinate.longitude });
      setLocationMessage(null);

      if (shouldCenterOnNextUserLocationRef.current) {
        stopWaitingForUserLocation(null);
        centerMap(coordinate, 0.025);
      }
    },
    [centerMap, onUserLocationChange, stopWaitingForUserLocation],
  );

  const handleCenterUserLocation = useCallback(async () => {
    setLocationMessage(null);

    const isGranted = hasLocationPermission
      ? true
      : await requestLocationPermission();

    if (!isGranted) {
      stopWaitingForUserLocation('Location permission is needed to center the map.');
      return;
    }

    if (userCoordinate) {
      centerMap(userCoordinate, 0.025);
      return;
    }

    shouldCenterOnNextUserLocationRef.current = true;
    setIsWaitingForUserLocation(true);

    if (userLocationTimeoutRef.current) {
      clearTimeout(userLocationTimeoutRef.current);
    }

    userLocationTimeoutRef.current = setTimeout(() => {
      stopWaitingForUserLocation(
        'Current location is not available. Check location services and try again.',
      );
    }, USER_LOCATION_TIMEOUT_MS);
  }, [
    centerMap,
    hasLocationPermission,
    requestLocationPermission,
    stopWaitingForUserLocation,
    userCoordinate,
  ]);

  const handleMapPress = useCallback(
    (event: MapPressEvent) => {
      const coordinate = event.nativeEvent.coordinate;
      onMapPress?.({ lat: coordinate.latitude, lon: coordinate.longitude });
    },
    [onMapPress],
  );

  const routePolylines = useMemo<RoutePolyline[]>(() => {
    if (!explorationVisible) {
      return [];
    }

    const segmentPolylines = segments
      .filter((segment) => segment.lineCode === lineCode)
      .map((segment) => ({
        id: `segment:${segment.id}`,
        coordinates: segment.points.map(toMapCoordinate).filter(hasFiniteCoordinate),
      }))
      .filter((polyline) => polyline.coordinates.length > 1);

    if (segmentPolylines.length > 0) {
      return segmentPolylines;
    }

    const fallbackPolyline = getFallbackPolyline(stations);
    return fallbackPolyline ? [fallbackPolyline] : [];
  }, [explorationVisible, lineCode, segments, stations]);
  const routeLayerKey = routePolylines
    .map((polyline) => `${polyline.id}:${polyline.coordinates.length}`)
    .join('|');
  const shouldRenderRoutePolylines = isMapReady && routePolylines.length > 0;
  const hasPlannerRoute = plannerPolylines.length > 0;
  const routeStrokeColor = hasPlannerRoute
    ? withAlpha(lineBrand.backgroundColor, 0.22)
    : lineBrand.backgroundColor;
  const routeStrokeWidth = hasPlannerRoute ? 3 : 5;
  const routeZIndex = hasPlannerRoute ? 1 : 5;

  return (
    <View
      style={styles.root}
      onLayout={(event) => {
        setMapHeight(event.nativeEvent.layout.height);
      }}
    >
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        mapPadding={mapPadding}
        legalLabelInsets={legalLabelInsets}
        appleLogoInsets={appleLogoInsets}
        onMapReady={() => setIsMapReady(true)}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={handleMapPress}
        onUserLocationChange={handleUserLocationChange}
        showsUserLocation={hasLocationPermission || isWaitingForUserLocation}
        userLocationPriority="balanced"
        userInterfaceStyle={colorScheme}
      >
        {shouldRenderRoutePolylines
          ? routePolylines.map((polyline) => (
              <Polyline
                key={`${lineCode}:route:${routeLayerKey}:${polyline.id}`}
                coordinates={polyline.coordinates}
                lineCap="round"
                lineJoin="round"
                strokeWidth={routeStrokeWidth}
                strokeColor={routeStrokeColor}
                zIndex={routeZIndex}
              />
            ))
          : null}

        {plannerPolylines.map((polyline, index) => {
          const coordinates = polyline.points
            .map(toMapCoordinate)
            .filter(hasFiniteCoordinate);
          if (coordinates.length < 2) {
            return null;
          }

          return (
            <Polyline
              key={`planner:${polyline.id}`}
              coordinates={coordinates}
              lineCap="round"
              lineJoin="round"
              strokeWidth={6}
              strokeColor={polyline.color}
              zIndex={45 + index}
            />
          );
        })}

        {visibleStations.map((station) => {
          const isSelected = station.code === selectedStationCode;

          return (
            <Marker
              key={`${lineCode}:station:${station.code}`}
              anchor={STATION_MARKER_ANCHOR}
              centerOffset={STATION_MARKER_CENTER_OFFSET}
              coordinate={{ latitude: station.lat, longitude: station.lon }}
              image={getStationMarkerImage(lineBrand.label, isSelected)}
              tracksViewChanges={false}
              zIndex={isSelected ? 20 : 10}
              onPress={() => handleStationPress(station.code)}
            />
          );
        })}

        {badgeStations.map((station) => {
          const isSelected = station.code === selectedStationCode;
          const interchange = interchangeByStationKey.get(`${lineCode}:${station.code}`);
          const interchangeLines =
            (interchange ? getUniqueInterchangeLines(interchange.members) : null) ?? [{
              code: lineCode,
              name: lineCode,
              mode,
              operator: mode === 'fgc' ? 'fgc' : 'tmb',
              vehicleMode: mode === 'fgc' ? 'rail' : mode,
              color: lineColor,
            }];
          const transferLines = prioritizeSelectedInterchangeLine(
            interchangeLines,
            mode,
            lineCode,
          );
          const visibleLineCount =
            isSelected || markerDetail === 'full'
              ? 3
              : interchangeLines.length === 2
                ? 2
                : 1;

          return (
            <Marker
              key={`${lineCode}:station-badges:${station.code}:${transferLines.map((line) => `${line.mode}-${line.code}`).join('-')}`}
              anchor={STATION_BADGE_ANCHOR}
              centerOffset={STATION_MARKER_CENTER_OFFSET}
              coordinate={{ latitude: station.lat, longitude: station.lon }}
              tracksViewChanges={false}
              zIndex={30}
              onPress={() => handleStationPress(station.code)}
            >
              <StationTransferBadges
                lines={transferLines}
                visibleLineCount={visibleLineCount}
              />
            </Marker>
          );
        })}

        {namedStations.map((station) => {
          const isSelected = station.code === selectedStationCode;

          return (
            <Marker
              key={`${lineCode}:station-name:${station.code}`}
              anchor={STATION_NAME_ANCHOR}
              centerOffset={STATION_NAME_CENTER_OFFSET}
              coordinate={{ latitude: station.lat, longitude: station.lon }}
              tracksViewChanges={false}
              zIndex={isSelected ? 40 : 35}
              onPress={() => handleStationPress(station.code)}
            >
              <StationNameLabel
                lineColor={lineBrand.backgroundColor}
                stationName={station.name}
                emphasized={isSelected}
              />
            </Marker>
          );
        })}

        {nearbyStops.slice(0, 25).map((stop) => (
          <Marker
            key={`nearby:${stop.mode}:${stop.lineCode}:${stop.code}`}
            anchor={STATION_MARKER_ANCHOR}
            centerOffset={STATION_MARKER_CENTER_OFFSET}
            coordinate={{ latitude: stop.lat, longitude: stop.lon }}
            tracksViewChanges={false}
            zIndex={8}
            onPress={() => onNearbyStopPress?.(stop)}
          >
            <NearbyStopDot mode={stop.mode} lineCode={stop.lineCode} lineColor={stop.lineColor} />
          </Marker>
        ))}

        {transitVehicles.map((vehicle) => (
          <Marker
            key={`vehicle:${vehicle.id}`}
            accessibilityLabel={`${vehicle.lineCode}${vehicle.destination ? `, ${vehicle.destination}` : ''}`}
            anchor={STATION_MARKER_ANCHOR}
            coordinate={{ latitude: vehicle.lat, longitude: vehicle.lon }}
            tracksViewChanges={false}
            zIndex={50}
          >
            <View style={[styles.vehicleMarker, { backgroundColor: lineBrand.backgroundColor }]}>
              <Text style={[styles.vehicleMarkerText, { color: lineBrand.textColor }]}>●</Text>
            </View>
            <Callout tooltip>
              <View style={styles.vehicleCallout}>
                <Text style={styles.vehicleCalloutTitle}>
                  {vehicle.lineCode}{vehicle.destination ? ` → ${vehicle.destination}` : ''}
                </Text>
                {vehicle.isOnTime !== undefined ? (
                  <Text style={styles.vehicleCalloutText}>
                    {t(vehicle.isOnTime ? 'vehicle_on_time' : 'vehicle_delayed')}
                  </Text>
                ) : null}
                {vehicle.occupancyPercent !== undefined ? (
                  <Text style={styles.vehicleCalloutText}>
                    {t('vehicle_occupancy', { percent: Math.round(vehicle.occupancyPercent) })}
                  </Text>
                ) : null}
                {vehicle.nextStops.length ? (
                  <Text style={styles.vehicleCalloutText} numberOfLines={2}>
                    {t('vehicle_next_stops', { stops: vehicle.nextStops.slice(0, 3).join(', ') })}
                  </Text>
                ) : null}
              </View>
            </Callout>
          </Marker>
        ))}

        {latitudeDelta <= 0.02
          ? nearbyStops.slice(0, latitudeDelta <= 0.008 ? 25 : 8).map((stop) => (
              <Marker
                key={`nearby-label:${stop.mode}:${stop.lineCode}:${stop.code}`}
                anchor={STATION_NAME_ANCHOR}
                centerOffset={STATION_NAME_CENTER_OFFSET}
                coordinate={{ latitude: stop.lat, longitude: stop.lon }}
                tracksViewChanges={false}
                zIndex={9}
                onPress={() => onNearbyStopPress?.(stop)}
              >
                <NearbyStopLabel
                  mode={stop.mode}
                  lineCode={stop.lineCode}
                  lineColor={stop.lineColor}
                  name={stop.name}
                />
              </Marker>
            ))
          : null}

        {plannerMarkers.map((marker) => {
          const coordinate = {
            latitude: marker.coordinate.lat,
            longitude: marker.coordinate.lon,
          };
          const selectionKey = marker.selected ? 'selected' : 'idle';
          const handlePress = () => onPlannerMarkerPress?.(marker.legId);

          if (marker.kind === 'origin' || marker.kind === 'destination') {
            return (
              <Marker
                key={`planner-endpoint:${marker.id}:${selectionKey}`}
                accessibilityLabel={marker.accessibilityLabel}
                anchor={STATION_MARKER_ANCHOR}
                centerOffset={STATION_MARKER_CENTER_OFFSET}
                coordinate={coordinate}
                tracksViewChanges={false}
                zIndex={75}
                onPress={handlePress}
              >
                <PlannerEndpointMarker marker={marker} />
              </Marker>
            );
          }

          const routeCode = marker.outgoingRoute ?? marker.incomingRoute ?? '';
          const routeMode = marker.outgoingMode ?? marker.incomingMode ?? getPlannerRouteMode(routeCode);
          const routeBrand = getLineBrand(routeMode, routeCode);
          const transferRoutes = [
            marker.incomingRoute
              ? { code: marker.incomingRoute, mode: marker.incomingMode ?? getPlannerRouteMode(marker.incomingRoute) }
              : null,
            marker.outgoingRoute
              ? { code: marker.outgoingRoute, mode: marker.outgoingMode ?? getPlannerRouteMode(marker.outgoingRoute) }
              : null,
          ].filter((value): value is { code: string; mode: TransportMode } => value !== null)
            .filter((value, index, values) =>
              index === values.findIndex((candidate) => candidate.code === value.code),
            );

          return (
            <Fragment key={`planner-station:${marker.id}:${selectionKey}`}>
              <Marker
                accessibilityLabel={marker.accessibilityLabel}
                anchor={STATION_MARKER_ANCHOR}
                centerOffset={STATION_MARKER_CENTER_OFFSET}
                coordinate={coordinate}
                image={getStationMarkerImage(routeBrand.label, Boolean(marker.selected))}
                tracksViewChanges={false}
                zIndex={60}
                onPress={handlePress}
              />
              {marker.kind === 'transfer' && transferRoutes.length > 1 ? (
                <Marker
                  accessibilityElementsHidden
                  anchor={STATION_BADGE_ANCHOR}
                  centerOffset={STATION_MARKER_CENTER_OFFSET}
                  coordinate={coordinate}
                  tracksViewChanges={false}
                  zIndex={65}
                  onPress={handlePress}
                >
                  <PlannerTransferBadges routes={transferRoutes} />
                </Marker>
              ) : null}
              <Marker
                accessibilityElementsHidden
                anchor={STATION_NAME_ANCHOR}
                centerOffset={STATION_NAME_CENTER_OFFSET}
                coordinate={coordinate}
                tracksViewChanges={false}
                zIndex={70}
                onPress={handlePress}
              >
                <StationNameLabel
                  lineColor={routeBrand.backgroundColor}
                  stationName={marker.name}
                  emphasized={marker.selected}
                />
              </Marker>
            </Fragment>
          );
        })}

      </MapView>

      <Animated.View
        pointerEvents="box-none"
        style={[styles.actionsColumn, bottomControlsAnimatedStyle]}
      >
        {bottomActions}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('map_center_location')}
          style={[
            styles.actionButton,
            !userCoordinate && !isWaitingForUserLocation && styles.actionButtonIdle,
          ]}
          onPress={handleCenterUserLocation}
        >
          {isWaitingForUserLocation ? (
            <ActivityIndicator color={palette.text} />
          ) : (
            <IconSymbol
              name="location.fill"
              size={22}
              color={userCoordinate ? palette.text : palette.textMuted}
              weight="semibold"
            />
          )}
        </Pressable>
      </Animated.View>
      {locationMessage ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.locationMessage, bottomControlsAnimatedStyle]}
        >
          <Text style={styles.locationMessageText}>{locationMessage}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

function StationTransferBadges({
  lines,
  visibleLineCount,
}: {
  lines: Line[];
  visibleLineCount: number;
}) {
  const styles = useThemedStyles(createStyles);
  const visibleLines = lines.slice(0, visibleLineCount);
  const extraCount = Math.max(0, lines.length - visibleLines.length);

  return (
    <View style={styles.transferBadgeAnchorBox}>
      <View style={styles.transferBadgeRow}>
        {visibleLines.map((line) => {
          const brand = getLineBrand(line.mode, line.code, line.color);

          return (
            <View
              key={`${line.mode}:${line.code}`}
              style={[
                styles.transferBadge,
                { backgroundColor: brand.backgroundColor },
              ]}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.transferBadgeText, { color: brand.textColor }]}
              >
                {brand.label}
              </Text>
            </View>
          );
        })}
        {extraCount > 0 ? (
          <View style={styles.extraBadge}>
            <Text style={styles.extraBadgeText}>+{extraCount}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function PlannerTransferBadges({
  routes,
}: {
  routes: { code: string; mode: TransportMode }[];
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.transferBadgeAnchorBox}>
      <View style={styles.transferBadgeRow}>
        {routes.slice(0, 3).map((route) => {
          const brand = getLineBrand(route.mode, route.code);
          return (
            <View
              key={`${route.mode}:${route.code}`}
              style={[styles.transferBadge, { backgroundColor: brand.backgroundColor }]}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.transferBadgeText, { color: brand.textColor }]}
              >
                {brand.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function NearbyStopDot({ mode, lineCode, lineColor }: { mode: TransportMode; lineCode: string; lineColor?: string }) {
  const styles = useThemedStyles(createStyles);
  const brand = getLineBrand(mode, lineCode, lineColor);
  return (
    <View
      style={[styles.nearbyDot, { backgroundColor: brand.backgroundColor }]}
    />
  );
}

function NearbyStopLabel({
  mode,
  lineCode,
  lineColor,
  name,
}: {
  mode: TransportMode;
  lineCode: string;
  lineColor?: string;
  name: string;
}) {
  const styles = useThemedStyles(createStyles);
  const brand = getLineBrand(mode, lineCode, lineColor);
  return (
    <View style={styles.nearbyLabel}>
      <View style={[styles.nearbyLabelBadge, { backgroundColor: brand.backgroundColor }]}>
        <Text style={styles.nearbyLabelBadgeText}>
          {brand.label}
        </Text>
      </View>
      <Text numberOfLines={1} style={styles.nearbyLabelText}>
        {name}
      </Text>
    </View>
  );
}

function StationNameLabel({
  lineColor,
  stationName,
  emphasized = false,
}: {
  lineColor: string;
  stationName: string;
  emphasized?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View
      style={[
        styles.stationNameLabel,
        emphasized
          ? [styles.stationNameLabelEmphasized, { borderColor: lineColor }]
          : null,
      ]}>
      <Text
        numberOfLines={2}
        style={[
          styles.stationNameText,
          emphasized ? styles.stationNameTextEmphasized : null,
        ]}>
        {stationName}
      </Text>
    </View>
  );
}

function PlannerEndpointMarker({ marker }: { marker: PlannerMapMarker }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.plannerEndpointWrap}>
      <View style={[styles.plannerMarker, marker.selected ? styles.plannerMarkerSelected : null]}>
        <Text style={styles.plannerMarkerText}>{marker.label}</Text>
      </View>
      {marker.kind === 'destination' ? <View style={styles.destinationTail} /> : null}
    </View>
  );
}

const createStyles = (palette: Palette) => StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  actionsColumn: {
    position: 'absolute',
    right: 16,
    bottom: 28,
    alignItems: 'flex-end',
    gap: 8,
    zIndex: 15,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.mapControlSurface,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
  actionButtonIdle: {
    opacity: 0.82,
  },
  locationMessage: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    maxWidth: 240,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: palette.surfaceTranslucent,
    borderWidth: 1,
    borderColor: palette.border,
    zIndex: 15,
  },
  locationMessageText: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  transferBadgeRow: {
    flexDirection: 'row',
    gap: 2,
  },
  transferBadgeAnchorBox: {
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    minWidth: 34,
    minHeight: 23,
    paddingLeft: 22,
    paddingBottom: 11,
  },
  transferBadge: {
    minWidth: 24,
    height: 19,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: palette.surface,
  },
  transferBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  extraBadge: {
    minWidth: 21,
    height: 19,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.surface,
  },
  extraBadgeText: {
    color: palette.text,
    fontSize: 10,
    fontWeight: '900',
  },
  nearbyDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: palette.surface,
    shadowColor: palette.shadow,
    shadowOpacity: 0.32,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  vehicleMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: palette.surface,
    shadowColor: palette.shadow,
    shadowOpacity: 0.32,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  vehicleMarkerText: {
    fontSize: 10,
    fontWeight: '900',
  },
  vehicleCallout: {
    width: 220,
    gap: 3,
    borderRadius: 12,
    padding: 12,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
  },
  vehicleCalloutTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '800',
  },
  vehicleCalloutText: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  nearbyLabel: {
    maxWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 6,
    backgroundColor: palette.surfaceTranslucent,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderStrong,
    paddingLeft: 3,
    paddingRight: 6,
    paddingVertical: 2,
    gap: 4,
  },
  nearbyLabelBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearbyLabelBadgeText: {
    color: palette.textInverse,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  nearbyLabelText: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  plannerMarker: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: palette.surfaceStrong,
    borderWidth: 2,
    borderColor: palette.surface,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  plannerEndpointWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  plannerMarkerSelected: {
    borderColor: palette.accent,
    borderWidth: 4,
  },
  destinationTail: {
    width: 10,
    height: 10,
    marginTop: -7,
    transform: [{ rotate: '45deg' }],
    backgroundColor: palette.surfaceStrong,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: palette.surface,
  },
  plannerMarkerText: {
    color: palette.textInverse,
    fontSize: 13,
    fontWeight: '800',
  },
  stationNameLabel: {
    maxWidth: 156,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 7,
    backgroundColor: palette.surfaceTranslucent,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderStrong,
    paddingHorizontal: 7,
    paddingVertical: 3,
    shadowColor: palette.shadow,
    shadowOpacity: 0.28,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  stationNameLabelEmphasized: {
    backgroundColor: palette.surfaceElevated,
    borderWidth: 2.5,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    transform: [{ scale: 1.04 }],
  },
  stationNameText: {
    color: palette.text,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'left',
    letterSpacing: 0.1,
  },
  stationNameTextEmphasized: {
    fontSize: 12,
    fontWeight: '800',
    color: palette.text,
  },
});
