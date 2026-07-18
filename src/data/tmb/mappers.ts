import type {
  Line,
  Station,
  TransitOperator,
  TransportMode,
  VehicleMode,
} from '@/src/domain/catalog/models';
import type { Segment } from '@/src/domain/geo/models';
import type { PlannedRoute } from '@/src/domain/planner/models';
import type { Arrival } from '@/src/domain/realtime/models';
import type { ServiceAlert } from '@/src/domain/alerts/models';
import type {
  ArrivalDto,
  LineDto,
  PlannedRouteDto,
  SegmentDto,
  ServiceAlertDto,
  StationDto,
} from '@/src/data/tmb/types';

function defaultOperator(mode: TransportMode): TransitOperator {
  if (mode === 'fgc') return 'fgc';
  if (mode === 'tram') return 'tram';
  return 'tmb';
}

function defaultVehicleMode(mode: TransportMode): VehicleMode {
  if (mode === 'fgc') return 'rail';
  return mode;
}

export function mapLineDto(dto: LineDto): Line {
  return {
    code: dto.code,
    name: dto.name,
    color: dto.color,
    textColor: dto.textColor,
    mode: dto.mode,
    operator: dto.operator ?? defaultOperator(dto.mode),
    vehicleMode: dto.vehicleMode ?? defaultVehicleMode(dto.mode),
    network: dto.network,
    originStation: dto.originStation,
    destinationStation: dto.destinationStation,
    serviceStatus: dto.serviceStatus,
  };
}

export function mapStationDto(dto: StationDto): Station {
  return {
    code: dto.code,
    lineCode: dto.lineCode,
    lineColor: dto.lineColor,
    mode: dto.mode,
    operator: dto.operator ?? defaultOperator(dto.mode),
    vehicleMode: dto.vehicleMode ?? defaultVehicleMode(dto.mode),
    network: dto.network,
    name: dto.name,
    lat: dto.lat,
    lon: dto.lon,
    order: dto.order,
    accessibilityTypeId: dto.accessibilityTypeId,
    accessibilityLabel: dto.accessibilityLabel,
    statusTypeId: dto.statusTypeId,
    statusLabel: dto.statusLabel,
    serviceDescription: dto.serviceDescription,
    serviceOrigin: dto.serviceOrigin,
    serviceDestination: dto.serviceDestination,
  };
}

export function mapSegmentDto(dto: SegmentDto): Segment {
  return {
    id: dto.id,
    lineCode: dto.lineCode,
    mode: dto.mode,
    operator: dto.operator ?? defaultOperator(dto.mode),
    fromStationCode: dto.fromStationCode,
    toStationCode: dto.toStationCode,
    points: dto.points,
  };
}

export function mapArrivalDto(dto: ArrivalDto): Arrival {
  return {
    lineCode: dto.lineCode,
    stationCode: dto.stationCode,
    mode: dto.mode,
    operator: dto.operator ?? defaultOperator(dto.mode),
    directionId: dto.directionId,
    platformCode: dto.platformCode,
    destination: dto.destination,
    etaSec: dto.etaSec,
    sourceTimestampMs: dto.sourceTimestampMs,
    serviceId: dto.serviceId,
    realtimeStatus: dto.realtimeStatus,
    delaySec: dto.delaySec,
    isCancelled: dto.isCancelled,
  };
}

function cleanServiceAlertTitle(title: string): string {
  return title.replace(/^[NP]P\d+\s+/i, '').trim();
}

export function mapServiceAlertDto(dto: ServiceAlertDto): ServiceAlert {
  return {
    id: dto.id,
    title: cleanServiceAlertTitle(dto.title),
    description: dto.description,
    mode: dto.mode,
    operator: dto.operator ?? (dto.mode === 'tram' ? 'tram' : dto.mode === 'fgc' ? 'fgc' : 'tmb'),
    affectedLines: dto.affectedLines.map((line) => ({
      ...line,
      operator: line.operator ?? defaultOperator(line.mode),
    })),
    severity: dto.severity,
    kind: dto.kind,
    source: dto.source,
    sourceUrl: dto.sourceUrl,
    dateLabel: dto.dateLabel,
    startsAtMs: dto.startsAtMs,
    endsAtMs: dto.endsAtMs,
    updatedAtMs: dto.updatedAtMs,
  };
}

export function mapPlannedRouteDto(dto: PlannedRouteDto): PlannedRoute {
  return {
    id: dto.id,
    durationSec: dto.durationSec,
    startTimeMs: dto.startTimeMs,
    endTimeMs: dto.endTimeMs,
    walkDistanceMeters: dto.walkDistanceMeters,
    transfers: dto.transfers,
    legs: dto.legs.map((leg) => ({
      id: leg.id,
      mode: leg.mode,
      route: leg.route,
      routeLongName: leg.routeLongName,
      agencyName: leg.agencyName,
      operator: leg.operator,
      transportMode: leg.transportMode,
      network: leg.network,
      from: leg.from,
      to: leg.to,
      startTimeMs: leg.startTimeMs,
      endTimeMs: leg.endTimeMs,
      durationSec: leg.durationSec,
      distanceMeters: leg.distanceMeters,
      points: leg.points,
    })),
  };
}
