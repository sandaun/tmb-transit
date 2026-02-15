import type { Line, Station } from '@/src/domain/catalog/models';
import type { Segment } from '@/src/domain/geo/models';
import type { Arrival } from '@/src/domain/realtime/models';

const mockLines: Line[] = [{ code: 'L3', name: 'L3', mode: 'metro', color: '00933B' }];

const mockStationsByLine: Record<string, Station[]> = {
  L3: [
    { code: '307', lineCode: 'L3', name: 'Maria Cristina', lat: 41.3927, lon: 2.1344, order: 7 },
    { code: '308', lineCode: 'L3', name: 'Les Corts', lat: 41.3852, lon: 2.1318, order: 8 },
    { code: '309', lineCode: 'L3', name: 'Plaça del Centre', lat: 41.3811, lon: 2.1369, order: 9 },
    { code: '310', lineCode: 'L3', name: 'Sants Estació', lat: 41.3785, lon: 2.1407, order: 10 },
    { code: '311', lineCode: 'L3', name: 'Tarragona', lat: 41.3764, lon: 2.1431, order: 11 },
  ],
};

const mockSegmentsByLine: Record<string, Segment[]> = {
  L3: [
    {
      id: 'l3-seg-1',
      lineCode: 'L3',
      fromStationCode: '307',
      toStationCode: '308',
      points: [
        { lat: 41.3927, lon: 2.1344 },
        { lat: 41.3852, lon: 2.1318 },
      ],
    },
    {
      id: 'l3-seg-2',
      lineCode: 'L3',
      fromStationCode: '308',
      toStationCode: '309',
      points: [
        { lat: 41.3852, lon: 2.1318 },
        { lat: 41.3811, lon: 2.1369 },
      ],
    },
    {
      id: 'l3-seg-3',
      lineCode: 'L3',
      fromStationCode: '309',
      toStationCode: '310',
      points: [
        { lat: 41.3811, lon: 2.1369 },
        { lat: 41.3785, lon: 2.1407 },
      ],
    },
    {
      id: 'l3-seg-4',
      lineCode: 'L3',
      fromStationCode: '310',
      toStationCode: '311',
      points: [
        { lat: 41.3785, lon: 2.1407 },
        { lat: 41.3764, lon: 2.1431 },
      ],
    },
  ],
};

export async function fetchMetroLinesFromMock(): Promise<Line[]> {
  return mockLines;
}

export async function fetchLineStationsFromMock(lineCode: string): Promise<Station[]> {
  return mockStationsByLine[lineCode] ?? [];
}

export async function fetchLineSegmentsFromMock(lineCode: string): Promise<Segment[]> {
  return mockSegmentsByLine[lineCode] ?? [];
}

export async function fetchStationArrivalsFromMock(
  lineCode: string,
  stationCode: string,
): Promise<Arrival[]> {
  const sourceTimestampMs = Date.now();

  return [
    {
      lineCode,
      stationCode,
      directionId: '1',
      platformCode: '1',
      destination: 'Zona Universitaria',
      etaSec: 65,
      sourceTimestampMs,
      serviceId: 'mock-zu-1',
    },
    {
      lineCode,
      stationCode,
      directionId: '1',
      platformCode: '1',
      destination: 'Zona Universitaria',
      etaSec: 200,
      sourceTimestampMs,
      serviceId: 'mock-zu-2',
    },
    {
      lineCode,
      stationCode,
      directionId: '2',
      platformCode: '2',
      destination: 'Trinitat Nova',
      etaSec: 95,
      sourceTimestampMs,
      serviceId: 'mock-tn-1',
    },
    {
      lineCode,
      stationCode,
      directionId: '2',
      platformCode: '2',
      destination: 'Trinitat Nova',
      etaSec: 245,
      sourceTimestampMs,
      serviceId: 'mock-tn-2',
    },
  ];
}
