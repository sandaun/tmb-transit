import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import type { Station } from '@/src/domain/catalog/models';
import type { Segment } from '@/src/domain/geo/models';
import type { VehicleEstimate } from '@/src/domain/realtime/models';

interface MapAdapterProps {
  lineCode: string;
  stations: Station[];
  segments: Segment[];
  selectedStationCode: string;
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
        .map((station) => (
          <Marker
            key={`${lineCode}:station:${station.code}`}
            coordinate={{ latitude: station.lat, longitude: station.lon }}
            pinColor={station.code === selectedStationCode ? '#2A70FF' : '#304157'}
            title={station.name}
            onPress={() => onStationPress(station.code)}
          />
        ))}

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

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
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
