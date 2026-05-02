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
import type { VehicleEstimate } from '@/src/domain/realtime/models';
import type { StationInterchange } from '@/src/features/station/utils/station-interchanges';
import { getMetroLineBrand } from '@/src/features/catalog/utils/metro-line-brand';

interface MapAdapterProps {
  lineCode: string;
  stations: Station[];
  segments: Segment[];
  selectedStationCode: string;
  stationInterchanges?: StationInterchange[];
  locationButtonTop?: number;
  vehicles: VehicleEstimate[];
  onStationPress: (stationCode: string) => void;
}

function getFallbackPolyline(stations: Station[]) {
  return stations.map((station) => ({
    latitude: station.lat,
    longitude: station.lon,
  }));
}

const USER_LOCATION_TIMEOUT_MS = 10_000;

export function MapAdapter({
  lineCode,
  stations,
  segments,
  selectedStationCode,
  stationInterchanges = [],
  locationButtonTop = 148,
  vehicles,
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

  const validSegments = segments
    .map((segment) => ({
      ...segment,
      points: segment.points.filter(
        (point) => Number.isFinite(point.lat) && Number.isFinite(point.lon),
      ),
    }))
    .filter((segment) => segment.points.length > 1);
  const fallbackPolyline = getFallbackPolyline(stations).filter(
    (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
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

  return (
    <View style={styles.root}>
      <MapView
        key={lineCode}
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        onMapReady={() => setIsMapReady(true)}
        onUserLocationChange={handleUserLocationChange}
        showsUserLocation={hasLocationPermission || isWaitingForUserLocation}
        userLocationPriority="balanced"
      >
        {validSegments.length > 0 ? (
          validSegments.map((segment) => (
            <Polyline
              key={`${lineCode}:segment:${segment.id}`}
              coordinates={segment.points.map((point) => ({
                latitude: point.lat,
                longitude: point.lon,
              }))}
              strokeWidth={4}
              strokeColor="#1595FF"
            />
          ))
        ) : fallbackPolyline.length > 1 ? (
          <Polyline
            key={`${lineCode}:fallback-route`}
            coordinates={fallbackPolyline}
            strokeWidth={4}
            strokeColor="#1595FF"
          />
        ) : null}

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
                  lineCodes={lineCodes}
                />
              </Marker>
            );
          })}

        {vehicles
          .filter(
            (vehicle) => Number.isFinite(vehicle.lat) && Number.isFinite(vehicle.lon),
          )
          .map((vehicle) => (
            <Marker
              key={`${lineCode}:vehicle:${vehicle.id}`}
              coordinate={{ latitude: vehicle.lat, longitude: vehicle.lon }}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={30}
              tracksViewChanges={false}
            >
              <View style={styles.vehicleDot} />
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

function StationMarker({
  isSelected,
  lineCodes,
}: {
  isSelected: boolean;
  lineCodes: string[];
}) {
  const visibleLineCodes = lineCodes.slice(0, 3);
  const extraCount = Math.max(0, lineCodes.length - visibleLineCodes.length);

  return (
    <View style={[styles.stationMarker, isSelected && styles.stationMarkerSelected]}>
      <View
        style={[
          styles.stationCore,
          isSelected && styles.stationCoreSelected,
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
    backgroundColor: '#2A70FF',
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
  vehicleDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#FF7A00',
  },
});
