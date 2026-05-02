import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

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
  vehicles: VehicleEstimate[];
  onStationPress: (stationCode: string) => void;
}

function getFallbackPolyline(stations: Station[]) {
  return stations.map((station) => ({
    latitude: station.lat,
    longitude: station.lon,
  }));
}

export function MapAdapter({
  lineCode,
  stations,
  segments,
  selectedStationCode,
  stationInterchanges = [],
  vehicles,
  onStationPress,
}: MapAdapterProps) {
  const mapRef = useRef<MapView | null>(null);
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
    if (!selectedStation || !mapRef.current) {
      return;
    }

    mapRef.current.animateToRegion({
      latitude: selectedStation.lat,
      longitude: selectedStation.lon,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  }, [selectedStation]);

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
    <MapView
      key={lineCode}
      ref={mapRef}
      style={styles.map}
      initialRegion={initialRegion}
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
  map: {
    ...StyleSheet.absoluteFillObject,
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
