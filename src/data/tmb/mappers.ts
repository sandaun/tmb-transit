import type { Line, Station } from '@/src/domain/catalog/models';
import type { Segment } from '@/src/domain/geo/models';
import type { Arrival } from '@/src/domain/realtime/models';
import type { ArrivalDto, LineDto, SegmentDto, StationDto } from '@/src/data/tmb/types';

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
