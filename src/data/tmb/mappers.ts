import type { Line, Station } from '@/src/domain/catalog/models';
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

export function mapLineDto(dto: LineDto): Line {
  return {
    code: dto.code,
    name: dto.name,
    color: dto.color,
    mode: dto.mode,
    originStation: dto.originStation,
    destinationStation: dto.destinationStation,
  };
}

export function mapStationDto(dto: StationDto): Station {
  return {
    code: dto.code,
    lineCode: dto.lineCode,
    lineColor: dto.lineColor,
    mode: dto.mode,
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
    directionId: dto.directionId,
    platformCode: dto.platformCode,
    destination: dto.destination,
    etaSec: dto.etaSec,
    sourceTimestampMs: dto.sourceTimestampMs,
    serviceId: dto.serviceId,
  };
}

export function mapServiceAlertDto(dto: ServiceAlertDto): ServiceAlert {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    mode: dto.mode,
    severity: dto.severity,
    affectedLines: dto.affectedLines,
    source: dto.source,
    sourceUrl: dto.sourceUrl,
    dateLabel: dto.dateLabel,
    startsAtMs: dto.startsAtMs,
    endsAtMs: dto.endsAtMs,
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
