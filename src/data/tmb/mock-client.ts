import type { Line, Station, TransportMode } from '@/src/domain/catalog/models';
import type { Segment } from '@/src/domain/geo/models';
import type { Arrival } from '@/src/domain/realtime/models';

const mockMetroLines: Line[] = [
  { code: 'L3', name: 'L3', mode: 'metro', color: '00933B' },
];

const mockBusLines: Line[] = [
  { code: 'V19', name: 'Verda 19', mode: 'bus', color: '4DAF50' },
  { code: 'H10', name: 'Horitzontal 10', mode: 'bus', color: '009DDC' },
];

const mockBusStationsByLine: Record<string, Station[]> = {
  V19: [
    { code: '1265', lineCode: 'V19', mode: 'bus', name: 'Pl. Catalunya', lat: 41.3870, lon: 2.1701, order: 1 },
    { code: '1266', lineCode: 'V19', mode: 'bus', name: 'Urquinaona', lat: 41.3905, lon: 2.1733, order: 2 },
    { code: '1267', lineCode: 'V19', mode: 'bus', name: 'Pg. de Sant Joan', lat: 41.3950, lon: 2.1768, order: 3 },
    { code: '1268', lineCode: 'V19', mode: 'bus', name: 'Hospital de Sant Pau', lat: 41.4115, lon: 2.1745, order: 4 },
  ],
  H10: [
    { code: '2401', lineCode: 'H10', mode: 'bus', name: 'Diagonal - Pg. de Gràcia', lat: 41.3939, lon: 2.1620, order: 1 },
    { code: '2402', lineCode: 'H10', mode: 'bus', name: 'Provença - Aribau', lat: 41.3920, lon: 2.1559, order: 2 },
    { code: '2403', lineCode: 'H10', mode: 'bus', name: 'Hospital Clínic', lat: 41.3893, lon: 2.1500, order: 3 },
  ],
};

const mockBusSegmentsByLine: Record<string, Segment[]> = {
  V19: [
    {
      id: 'bus-v19-seg',
      lineCode: 'V19',
      mode: 'bus',
      points: [
        { lat: 41.3870, lon: 2.1701 },
        { lat: 41.3905, lon: 2.1733 },
        { lat: 41.3950, lon: 2.1768 },
        { lat: 41.4115, lon: 2.1745 },
      ],
    },
  ],
  H10: [
    {
      id: 'bus-h10-seg',
      lineCode: 'H10',
      mode: 'bus',
      points: [
        { lat: 41.3939, lon: 2.1620 },
        { lat: 41.3920, lon: 2.1559 },
        { lat: 41.3893, lon: 2.1500 },
      ],
    },
  ],
};

const mockMetroStationsByLine: Record<string, Station[]> = {
  L3: [
    { code: '307', lineCode: 'L3', mode: 'metro', name: 'Maria Cristina', lat: 41.3927, lon: 2.1344, order: 7 },
    { code: '308', lineCode: 'L3', mode: 'metro', name: 'Les Corts', lat: 41.3852, lon: 2.1318, order: 8 },
    { code: '309', lineCode: 'L3', mode: 'metro', name: 'Plaça del Centre', lat: 41.3811, lon: 2.1369, order: 9 },
    { code: '310', lineCode: 'L3', mode: 'metro', name: 'Sants Estació', lat: 41.3785, lon: 2.1407, order: 10 },
    { code: '311', lineCode: 'L3', mode: 'metro', name: 'Tarragona', lat: 41.3764, lon: 2.1431, order: 11 },
  ],
};

const mockMetroSegmentsByLine: Record<string, Segment[]> = {
  L3: [
    {
      id: 'l3-seg-1',
      lineCode: 'L3',
      mode: 'metro',
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
      mode: 'metro',
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
      mode: 'metro',
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
      mode: 'metro',
      fromStationCode: '310',
      toStationCode: '311',
      points: [
        { lat: 41.3785, lon: 2.1407 },
        { lat: 41.3764, lon: 2.1431 },
      ],
    },
  ],
};

export async function fetchLinesFromMock(mode: TransportMode): Promise<Line[]> {
  if (mode === 'bus') {
    return mockBusLines;
  }

  return mockMetroLines;
}

export async function fetchLineStationsFromMock(
  mode: TransportMode,
  lineCode: string,
): Promise<Station[]> {
  if (mode === 'bus') {
    return mockBusStationsByLine[lineCode] ?? [];
  }

  return mockMetroStationsByLine[lineCode] ?? [];
}

export async function fetchLineSegmentsFromMock(
  mode: TransportMode,
  lineCode: string,
): Promise<Segment[]> {
  if (mode === 'bus') {
    return mockBusSegmentsByLine[lineCode] ?? [];
  }

  return mockMetroSegmentsByLine[lineCode] ?? [];
}

export async function fetchStationArrivalsFromMock(
  mode: TransportMode,
  lineCode: string,
  stationCode: string,
): Promise<Arrival[]> {
  const sourceTimestampMs = Date.now();

  if (mode === 'bus') {
    return [
      {
        lineCode,
        stationCode,
        mode,
        directionId: 'fwd',
        destination: 'Sant Genís',
        etaSec: 120,
        sourceTimestampMs,
        serviceId: 'mock-bus-1',
      },
      {
        lineCode,
        stationCode,
        mode,
        directionId: 'fwd',
        destination: 'Sant Genís',
        etaSec: 540,
        sourceTimestampMs,
        serviceId: 'mock-bus-2',
      },
    ];
  }

  return [
    {
      lineCode,
      stationCode,
      mode,
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
      mode,
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
      mode,
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
      mode,
      directionId: '2',
      platformCode: '2',
      destination: 'Trinitat Nova',
      etaSec: 245,
      sourceTimestampMs,
      serviceId: 'mock-tn-2',
    },
  ];
}
