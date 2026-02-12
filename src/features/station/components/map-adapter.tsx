import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import type { Station } from '@/src/domain/catalog/models';
import type { Segment } from '@/src/domain/geo/models';
import type { VehicleEstimate } from '@/src/domain/realtime/models';

interface MapAdapterProps {
  stations: Station[];
  segments: Segment[];
  targetStationCode: string;
  vehicles: VehicleEstimate[];
}

function getFallbackPolyline(stations: Station[]) {
  return stations.map((station) => ({ latitude: station.lat, longitude: station.lon }));
}

export function MapAdapter({ stations, segments, targetStationCode, vehicles }: MapAdapterProps) {
  const targetStation = stations.find((station) => station.code === targetStationCode);

  const initialRegion = useMemo(() => {
    const center = targetStation ?? stations[0];

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
  }, [stations, targetStation]);

  const hasSegments = segments.some((segment) => segment.points.length > 1);

  return (
    <MapView style={styles.map} initialRegion={initialRegion}>
      {hasSegments
        ? segments.map((segment) => (
            <Polyline
              key={segment.id}
              coordinates={segment.points.map((point) => ({
                latitude: point.lat,
                longitude: point.lon,
              }))}
              strokeWidth={4}
              strokeColor="#008DDA"
            />
          ))
        : (
            <Polyline
              coordinates={getFallbackPolyline(stations)}
              strokeWidth={4}
              strokeColor="#008DDA"
            />
          )}

      {stations.map((station) => (
        <Marker
          key={station.code}
          coordinate={{ latitude: station.lat, longitude: station.lon }}
          pinColor={station.code === targetStationCode ? '#E63946' : '#1D3557'}
          title={station.name}
        />
      ))}

      {vehicles.map((vehicle) => (
        <Marker
          key={vehicle.id}
          coordinate={{ latitude: vehicle.lat, longitude: vehicle.lon }}
          anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.vehicleDot} />
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: 330,
    borderRadius: 12,
  },
  vehicleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#FF7A00',
  },
});
