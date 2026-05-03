import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  type LatLng,
  type UserLocationChangeEvent,
} from 'react-native-maps';

import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Station } from '@/src/domain/catalog/models';
import type { Segment } from '@/src/domain/geo/models';
import type { StationInterchange } from '@/src/features/station/utils/station-interchanges';
import { getMetroLineBrand } from '@/src/features/catalog/utils/metro-line-brand';

interface MapAdapterProps {
  lineCode: string;
  stations: Station[];
  segments: Segment[];
  selectedStationCode: string;
  stationInterchanges?: StationInterchange[];
  isRouteLoading?: boolean;
  locationButtonTop?: number;
  onStationPress: (stationCode: string) => void;
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

export function MapAdapter({
  lineCode,
  stations,
  segments,
  selectedStationCode,
  stationInterchanges = [],
  isRouteLoading = false,
  locationButtonTop = 148,
  onStationPress,
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
  const selectedStation = stations.find(
    (station) => station.code === selectedStationCode,
  );
  const lineBrand = getMetroLineBrand(lineCode);

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

  const centerMap = useCallback((coordinate: LatLng, delta = 0.05) => {
    mapRef.current?.animateToRegion(
      {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        latitudeDelta: delta,
        longitudeDelta: delta,
      },
      450,
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
      setLocationMessage(null);

      if (shouldCenterOnNextUserLocationRef.current) {
        stopWaitingForUserLocation(null);
        centerMap(coordinate, 0.025);
      }
    },
    [centerMap, stopWaitingForUserLocation],
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
  const selectedStationColor = lineBrand.backgroundColor;
  const selectedStationBorderColor =
    lineBrand.textColor === '#111827' ? '#111827' : '#FFFFFF';
  const selectedStationHaloColor =
    lineBrand.textColor === '#111827'
      ? 'rgba(17, 24, 39, 0.16)'
      : 'rgba(255, 255, 255, 0.2)';
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

  return (
    <View style={styles.root}>
      <MapView
        key={mapKey}
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        onMapReady={() => setIsMapReady(true)}
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

        {stations
          .filter(
            (station) => Number.isFinite(station.lat) && Number.isFinite(station.lon),
          )
          .map((station) => {
            const isSelected = station.code === selectedStationCode;
            const interchange = interchangeByStationKey.get(
              `${lineCode}:${station.code}`,
            );
            const lineCodes =
              interchange?.members.map((member) => member.line.code) ?? [lineCode];

            return (
              <Marker
                key={`${lineCode}:station:${station.code}`}
                coordinate={{ latitude: station.lat, longitude: station.lon }}
                zIndex={isSelected ? 20 : 10}
                onPress={() => onStationPress(station.code)}
              >
                <StationMarker
                  isSelected={isSelected}
                  selectedColor={selectedStationColor}
                  selectedBorderColor={selectedStationBorderColor}
                  selectedHaloColor={selectedStationHaloColor}
                  lineCodes={lineCodes}
                />
              </Marker>
            );
          })}

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

function StationMarker({
  isSelected,
  selectedColor,
  selectedBorderColor,
  selectedHaloColor,
  lineCodes,
}: {
  isSelected: boolean;
  selectedColor: string;
  selectedBorderColor: string;
  selectedHaloColor: string;
  lineCodes: string[];
}) {
  const visibleLineCodes = lineCodes.slice(0, 3);
  const extraCount = Math.max(0, lineCodes.length - visibleLineCodes.length);

  return (
    <View style={[styles.stationMarker, isSelected && styles.stationMarkerSelected]}>
      {isSelected ? (
        <View
          pointerEvents="none"
          style={[
            styles.stationSelectionHalo,
            {
              backgroundColor: selectedHaloColor,
              borderColor: selectedColor,
            },
          ]}
        />
      ) : null}
      <View
        style={[
          styles.stationCore,
          isSelected && styles.stationCoreSelected,
          isSelected && {
            backgroundColor: selectedColor,
            borderColor: selectedBorderColor,
            shadowColor: selectedColor,
          },
        ]}
      />
      {lineCodes.length > 1 ? (
        <View style={styles.transferBadgeRow}>
          {visibleLineCodes.map((lineCode) => {
            const brand = getMetroLineBrand(lineCode);

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
      ) : null}
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
  stationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 26,
    minHeight: 26,
  },
  stationMarkerSelected: {
    minWidth: 34,
    minHeight: 34,
  },
  stationSelectionHalo: {
    position: 'absolute',
    width: 31,
    height: 31,
    borderRadius: 16,
    borderWidth: 1,
  },
  stationCore: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#304157',
  },
  stationCoreSelected: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 4,
  },
  transferBadgeRow: {
    position: 'absolute',
    top: -14,
    flexDirection: 'row',
    gap: 2,
  },
  transferBadge: {
    minWidth: 20,
    height: 16,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  transferBadgeText: {
    fontSize: 8,
    fontWeight: '900',
  },
  extraBadge: {
    minWidth: 18,
    height: 16,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    backgroundColor: '#152136',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  extraBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
});
