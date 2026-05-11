import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageRequireSource,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  type LatLng,
  type Region,
  type UserLocationChangeEvent,
} from 'react-native-maps';

import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Station, TransportMode } from '@/src/domain/catalog/models';
import type { Segment } from '@/src/domain/geo/models';
import { getLineBrand } from '@/src/features/catalog/utils/line-brand';
import type { StationInterchange } from '@/src/features/station/utils/station-interchanges';

interface NearbyStopMarker {
  code: string;
  name: string;
  lat: number;
  lon: number;
  mode: TransportMode;
}

interface MapAdapterProps {
  lineCode: string;
  lineColor?: string;
  mode: TransportMode;
  stations: Station[];
  segments: Segment[];
  selectedStationCode: string;
  stationInterchanges?: StationInterchange[];
  isRouteLoading?: boolean;
  locationButtonTop?: number;
  bottomInset?: number;
  nearbyStops?: NearbyStopMarker[];
  onStationPress: (stationCode: string) => void;
  onUserLocationChange?: (coordinate: { lat: number; lon: number } | null) => void;
  onNearbyStopPress?: (stop: NearbyStopMarker) => void;
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
  selectedStationCode,
  stationInterchanges = [],
  isRouteLoading = false,
  locationButtonTop = 148,
  bottomInset = 0,
  nearbyStops = [],
  onStationPress,
  onUserLocationChange,
  onNearbyStopPress,
}: MapAdapterProps) {
  const mapRef = useRef<MapView | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(
    Platform.OS !== 'android',
  );
  const [isWaitingForUserLocation, setIsWaitingForUserLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const shouldCenterOnNextUserLocationRef = useRef(false);
  const userLocationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userCoordinate, setUserCoordinate] = useState<LatLng | null>(null);
  const [latitudeDelta, setLatitudeDelta] = useState(0.05);
  const selectedStation = stations.find(
    (station) => station.code === selectedStationCode,
  );
  const lineBrand = getLineBrand(mode, lineCode, lineColor);

  const handleRegionChangeComplete = useCallback((region: Region) => {
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
    if (Platform.OS !== 'android') {
      return;
    }

    let isMounted = true;

    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
      .then((isGranted) => {
        if (isMounted) {
          setHasLocationPermission(isGranted);
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

  const requestAndroidLocationPermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setHasLocationPermission(true);
      return true;
    }

    try {
      const status = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location access',
          message: 'TMB Transit uses your location to center the map around you.',
          buttonPositive: 'Allow',
          buttonNegative: 'Not now',
        },
      );
      const isGranted = status === PermissionsAndroid.RESULTS.GRANTED;

      setHasLocationPermission(isGranted);
      return isGranted;
    } catch {
      setHasLocationPermission(false);
      return false;
    }
  }, []);

  const visibleStations = useMemo(
    () =>
      stations.filter(
        (station) => Number.isFinite(station.lat) && Number.isFinite(station.lon),
      ),
    [stations],
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

  const mapPadding = useMemo(
    () => ({ top: 0, right: 0, bottom: bottomInset, left: 0 }),
    [bottomInset],
  );
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
        return (interchange?.members.length ?? 1) > 1;
      }),
    [interchangeByStationKey, lineCode, visibleStations],
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
    if (!selectedStation || !isMapReady) {
      return;
    }

    centerMap({
      latitude: selectedStation.lat,
      longitude: selectedStation.lon,
    });
  }, [centerMap, isMapReady, selectedStation]);

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
      : await requestAndroidLocationPermission();

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
    requestAndroidLocationPermission,
    stopWaitingForUserLocation,
    userCoordinate,
  ]);

  const routePolylines = useMemo<RoutePolyline[]>(() => {
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

    if (isRouteLoading) {
      return [];
    }

    const fallbackPolyline = getFallbackPolyline(stations);
    return fallbackPolyline ? [fallbackPolyline] : [];
  }, [isRouteLoading, lineCode, segments, stations]);
  const routeLayerKey = routePolylines
    .map((polyline) => `${polyline.id}:${polyline.coordinates.length}`)
    .join('|');
  const mapKey = `${lineCode}:${isRouteLoading ? 'route-loading' : routeLayerKey}`;
  const routeStrokeColor = lineBrand.backgroundColor;

  return (
    <View style={styles.root}>
      <MapView
        key={mapKey}
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        mapPadding={mapPadding}
        onMapReady={() => setIsMapReady(true)}
        onRegionChangeComplete={handleRegionChangeComplete}
        onUserLocationChange={handleUserLocationChange}
        showsUserLocation={hasLocationPermission || isWaitingForUserLocation}
        userLocationPriority="balanced"
      >
        {routePolylines.map((polyline) => (
            <Polyline
              key={`${lineCode}:route:${routeLayerKey}:${polyline.id}`}
              coordinates={polyline.coordinates}
              lineCap="round"
              lineJoin="round"
              strokeWidth={5}
              strokeColor={routeStrokeColor}
              zIndex={5}
            />
        ))}

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
          const interchange = interchangeByStationKey.get(`${lineCode}:${station.code}`);
          const lineCodes =
            interchange?.members.map((member) => member.line.code) ?? [lineCode];

          return (
            <Marker
              key={`${lineCode}:station-badges:${station.code}:${lineCodes.join('-')}`}
              anchor={STATION_BADGE_ANCHOR}
              centerOffset={STATION_MARKER_CENTER_OFFSET}
              coordinate={{ latitude: station.lat, longitude: station.lon }}
              tracksViewChanges={false}
              zIndex={30}
              onPress={() => handleStationPress(station.code)}
            >
              <StationTransferBadges lineCodes={lineCodes} mode={mode} />
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

        {nearbyStops.map((stop) => (
          <Marker
            key={`nearby:${stop.mode}:${stop.code}`}
            anchor={STATION_MARKER_ANCHOR}
            centerOffset={STATION_MARKER_CENTER_OFFSET}
            coordinate={{ latitude: stop.lat, longitude: stop.lon }}
            tracksViewChanges={false}
            zIndex={8}
            onPress={() => onNearbyStopPress?.(stop)}
          >
            <NearbyStopDot mode={stop.mode} />
          </Marker>
        ))}

      </MapView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Center map on your current location"
        style={[
          styles.locationButton,
          { top: locationButtonTop },
          !userCoordinate && !isWaitingForUserLocation && styles.locationButtonIdle,
        ]}
        onPress={handleCenterUserLocation}
      >
        {isWaitingForUserLocation ? (
          <ActivityIndicator color="#F4F8FF" />
        ) : (
          <IconSymbol
            name="location.fill"
            size={22}
            color={userCoordinate ? '#F4F8FF' : '#AFC2E8'}
            weight="semibold"
          />
        )}
      </Pressable>
      {locationMessage ? (
        <View
          pointerEvents="none"
          style={[styles.locationMessage, { top: locationButtonTop + 56 }]}
        >
          <Text style={styles.locationMessageText}>{locationMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

function StationTransferBadges({
  lineCodes,
  mode,
}: {
  lineCodes: string[];
  mode: TransportMode;
}) {
  const visibleLineCodes = lineCodes.slice(0, 3);
  const extraCount = Math.max(0, lineCodes.length - visibleLineCodes.length);

  return (
    <View style={styles.transferBadgeAnchorBox}>
      <View style={styles.transferBadgeRow}>
        {visibleLineCodes.map((lineCode) => {
          const brand = getLineBrand(mode, lineCode);

          return (
            <View
              key={lineCode}
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

function NearbyStopDot({ mode }: { mode: TransportMode }) {
  return (
    <View
      style={[
        styles.nearbyDot,
        mode === 'bus' ? styles.nearbyDotBus : styles.nearbyDotMetro,
      ]}
    />
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
  return (
    <View
      style={[
        styles.stationNameLabel,
        emphasized ? styles.stationNameLabelEmphasized : null,
      ]}>
      {emphasized ? (
        <View style={[styles.stationNameAccent, { backgroundColor: lineColor }]} />
      ) : null}
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

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  locationButton: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 19, 36, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
    zIndex: 15,
  },
  locationButtonIdle: {
    opacity: 0.82,
  },
  locationMessage: {
    position: 'absolute',
    right: 16,
    maxWidth: 240,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: 'rgba(10, 19, 36, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 15,
  },
  locationMessageText: {
    color: '#D7E5FF',
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
    borderColor: '#FFFFFF',
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
    backgroundColor: '#152136',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  extraBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  nearbyDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  nearbyDotMetro: {
    backgroundColor: '#0B5FFF',
  },
  nearbyDotBus: {
    backgroundColor: '#22A06B',
  },
  stationNameLabel: {
    maxWidth: 156,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 7,
    backgroundColor: 'rgba(11, 18, 32, 0.86)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  stationNameLabelEmphasized: {
    paddingLeft: 0,
    backgroundColor: 'rgba(7, 12, 24, 0.94)',
    borderColor: 'rgba(255, 255, 255, 0.28)',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    transform: [{ scale: 1.04 }],
  },
  stationNameAccent: {
    width: 3,
    alignSelf: 'stretch',
    marginRight: 6,
    borderTopLeftRadius: 7,
    borderBottomLeftRadius: 7,
  },
  stationNameText: {
    color: '#F4F8FF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'left',
    letterSpacing: 0.1,
  },
  stationNameTextEmphasized: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
