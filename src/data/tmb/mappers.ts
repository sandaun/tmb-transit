import type { Line, Station } from '@/src/domain/catalog/models';
import type { Segment } from '@/src/domain/geo/models';
import type { Arrival } from '@/src/domain/realtime/models';
import type { ArrivalDto, LineDto, SegmentDto, StationDto } from '@/src/data/tmb/types';

export function mapLineDto(dto: LineDto): Line {
  return {
    code: dto.code,
    name: dto.name,
    color: dto.color,
    mode: 'metro',
  };
}

export function mapStationDto(dto: StationDto): Station {
  return {
    code: dto.code,
    lineCode: dto.lineCode,
    name: dto.name,
    lat: dto.lat,
    lon: dto.lon,
    order: dto.order,
  };
}

export function mapSegmentDto(dto: SegmentDto): Segment {
  return {
    id: dto.id,
    lineCode: dto.lineCode,
    fromStationCode: dto.fromStationCode,
    toStationCode: dto.toStationCode,
    points: dto.points,
  };
}

export function mapArrivalDto(dto: ArrivalDto): Arrival {
  return {
    lineCode: dto.lineCode,
    stationCode: dto.stationCode,
    directionId: dto.directionId,
    destination: dto.destination,
    etaSec: dto.etaSec,
    sourceTimestampMs: dto.sourceTimestampMs,
    serviceId: dto.serviceId,
  };
}
