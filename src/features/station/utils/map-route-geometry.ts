import type { Station } from '@/src/domain/catalog/models';
import type { LatLng, Segment } from '@/src/domain/geo/models';

const METERS_PER_LATITUDE_DEGREE = 111_320;
const MARKER_SPACING_VIEWPORT_RATIO = 0.055;
const MAX_STATION_ROUTE_DISTANCE_METERS = 300;
const COORDINATE_DEDUPLICATION_METERS = 1;

interface StationProjection {
  position: number;
  distanceMeters: number;
  station: Station;
}

function distanceMeters(first: LatLng, second: LatLng): number {
  const averageLatitudeRadians = ((first.lat + second.lat) / 2) * (Math.PI / 180);
  const latitudeMeters = (second.lat - first.lat) * METERS_PER_LATITUDE_DEGREE;
  const longitudeMeters =
    (second.lon - first.lon) *
    METERS_PER_LATITUDE_DEGREE *
    Math.cos(averageLatitudeRadians);

  return Math.hypot(latitudeMeters, longitudeMeters);
}

function isFinitePoint(point: LatLng): boolean {
  return Number.isFinite(point.lat) && Number.isFinite(point.lon);
}

function projectStationOntoRoute(
  points: LatLng[],
  station: Station,
): StationProjection | null {
  let closestProjection: StationProjection | null = null;

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const averageLatitudeRadians = ((start.lat + end.lat + station.lat) / 3) * (Math.PI / 180);
    const longitudeScale = METERS_PER_LATITUDE_DEGREE * Math.cos(averageLatitudeRadians);
    const segmentX = (end.lon - start.lon) * longitudeScale;
    const segmentY = (end.lat - start.lat) * METERS_PER_LATITUDE_DEGREE;
    const stationX = (station.lon - start.lon) * longitudeScale;
    const stationY = (station.lat - start.lat) * METERS_PER_LATITUDE_DEGREE;
    const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
    const ratio = segmentLengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, (stationX * segmentX + stationY * segmentY) / segmentLengthSquared));
    const projectedPoint = {
      lat: start.lat + (end.lat - start.lat) * ratio,
      lon: start.lon + (end.lon - start.lon) * ratio,
    };
    const projection = {
      position: index + ratio,
      distanceMeters: distanceMeters(station, projectedPoint),
      station,
    };

    if (!closestProjection || projection.distanceMeters < closestProjection.distanceMeters) {
      closestProjection = projection;
    }
  }

  return closestProjection;
}

function appendDistinctPoint(points: LatLng[], point: LatLng): void {
  const previousPoint = points[points.length - 1];
  if (!previousPoint || distanceMeters(previousPoint, point) > COORDINATE_DEDUPLICATION_METERS) {
    points.push(point);
  }
}

export function selectStationMarkers(
  stations: Station[],
  selectedStationCode: string,
  latitudeDelta: number,
): Station[] {
  const validStations = stations.filter(isFinitePoint);
  if (validStations.length <= 2 || !Number.isFinite(latitudeDelta) || latitudeDelta <= 0) {
    return validStations;
  }

  const minimumSpacingMeters =
    latitudeDelta * METERS_PER_LATITUDE_DEGREE * MARKER_SPACING_VIEWPORT_RATIO;
  const retainedCodes = new Set<string>();
  const retainedStations: Station[] = [];
  const retain = (station: Station | undefined) => {
    if (!station || retainedCodes.has(station.code)) {
      return;
    }
    retainedCodes.add(station.code);
    retainedStations.push(station);
  };

  retain(validStations.find((station) => station.code === selectedStationCode));
  retain(validStations[0]);
  retain(validStations[validStations.length - 1]);

  for (const station of validStations) {
    const hasEnoughSpace = retainedStations.every(
      (retainedStation) => distanceMeters(station, retainedStation) >= minimumSpacingMeters,
    );
    if (hasEnoughSpace) {
      retain(station);
    }
  }

  return validStations.filter((station) => retainedCodes.has(station.code));
}

export function trimSegmentToStations(segment: Segment, stations: Station[]): LatLng[] {
  const points = segment.points.filter(isFinitePoint);
  if (points.length < 2) {
    return points;
  }

  const stationByCode = new Map(stations.map((station) => [station.code, station]));
  const explicitStations = [
    segment.fromStationCode ? stationByCode.get(segment.fromStationCode) : undefined,
    segment.toStationCode ? stationByCode.get(segment.toStationCode) : undefined,
  ].filter((station): station is Station => station !== undefined);
  const candidates = explicitStations.length === 2 ? explicitStations : stations;
  const projections = candidates
    .filter(isFinitePoint)
    .map((station) => projectStationOntoRoute(points, station))
    .filter((projection): projection is StationProjection =>
      projection !== null && projection.distanceMeters <= MAX_STATION_ROUTE_DISTANCE_METERS,
    )
    .sort((first, second) => first.position - second.position);
  const terminalCodes = new Set([
    stations[0]?.code,
    stations[stations.length - 1]?.code,
  ]);
  const terminalProjection = projections
    .filter((projection) => terminalCodes.has(projection.station.code))
    .sort((first, second) => first.distanceMeters - second.distanceMeters)[0];

  if (projections.length < 2) {
    // Some providers return a separate dead-end geometry before or after a
    // terminal. A segment that only reaches one terminal contains no service
    // between stations and should not be drawn.
    if (terminalProjection) {
      return [{ lat: terminalProjection.station.lat, lon: terminalProjection.station.lon }];
    }

    return points;
  }

  const start = projections[0];
  const end = projections[projections.length - 1];
  if (end.position - start.position < 0.001) {
    if (terminalProjection) {
      return [{ lat: terminalProjection.station.lat, lon: terminalProjection.station.lon }];
    }

    return points;
  }

  const trimmedPoints: LatLng[] = [];
  appendDistinctPoint(trimmedPoints, { lat: start.station.lat, lon: start.station.lon });

  const firstVertexIndex = Math.ceil(start.position);
  const lastVertexIndex = Math.floor(end.position);
  for (let index = firstVertexIndex; index <= lastVertexIndex; index += 1) {
    const point = points[index];
    if (point) {
      appendDistinctPoint(trimmedPoints, point);
    }
  }

  appendDistinctPoint(trimmedPoints, { lat: end.station.lat, lon: end.station.lon });
  return trimmedPoints.length >= 2 ? trimmedPoints : points;
}
