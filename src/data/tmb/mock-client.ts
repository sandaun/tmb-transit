import type { ServiceAlert } from '@/src/domain/alerts/models';
import type { Line, Station, TransportMode } from '@/src/domain/catalog/models';
import type { LatLng, Segment } from '@/src/domain/geo/models';
import type { NearbyStop } from '@/src/domain/nearby/models';
import type { PlannedRoute } from '@/src/domain/planner/models';
import type { Arrival } from '@/src/domain/realtime/models';

const mockMetroLines: Line[] = [
  { code: 'L3', name: 'L3', mode: 'metro', color: '00933B' },
];

const mockFgcLines: Line[] = [
  {
    code: 'L6',
    name: 'Barcelona Pl. Catalunya - Sarrià',
    mode: 'fgc',
    operator: 'fgc',
    vehicleMode: 'metro',
    network: 'barcelona-valles',
    color: '797FBC',
    originStation: 'Barcelona Pl. Catalunya',
    destinationStation: 'Sarrià',
  },
  {
    code: 'S1',
    name: 'Barcelona Pl. Catalunya - Terrassa Nacions Unides',
    mode: 'fgc',
    operator: 'fgc',
    vehicleMode: 'rail',
    network: 'barcelona-valles',
    color: 'EF7900',
    originStation: 'Barcelona Pl. Catalunya',
    destinationStation: 'Terrassa Nacions Unides',
  },
];

const mockFgcStationsByLine: Record<string, Station[]> = {
  L6: [
    { code: 'PC', lineCode: 'L6', mode: 'fgc', operator: 'fgc', vehicleMode: 'metro', network: 'barcelona-valles', name: 'Barcelona - Plaça Catalunya', lat: 41.38563, lon: 2.16872, order: 1 },
    { code: 'PR', lineCode: 'L6', mode: 'fgc', operator: 'fgc', vehicleMode: 'metro', network: 'barcelona-valles', name: 'Provença', lat: 41.39281, lon: 2.15803, order: 2 },
    { code: 'SR', lineCode: 'L6', mode: 'fgc', operator: 'fgc', vehicleMode: 'metro', network: 'barcelona-valles', name: 'Sarrià', lat: 41.39893, lon: 2.12557, order: 3 },
  ],
  S1: [
    { code: 'PC', lineCode: 'S1', mode: 'fgc', operator: 'fgc', vehicleMode: 'rail', network: 'barcelona-valles', name: 'Barcelona - Plaça Catalunya', lat: 41.38563, lon: 2.16872, order: 1 },
    { code: 'PR', lineCode: 'S1', mode: 'fgc', operator: 'fgc', vehicleMode: 'rail', network: 'barcelona-valles', name: 'Provença', lat: 41.39281, lon: 2.15803, order: 2 },
    { code: 'SC', lineCode: 'S1', mode: 'fgc', operator: 'fgc', vehicleMode: 'rail', network: 'barcelona-valles', name: 'Sant Cugat Centre', lat: 41.47269, lon: 2.08663, order: 3 },
  ],
};

const mockFgcSegmentsByLine: Record<string, Segment[]> = Object.fromEntries(
  Object.entries(mockFgcStationsByLine).map(([lineCode, stations]) => [
    lineCode,
    [{
      id: `fgc-${lineCode.toLowerCase()}-segment`,
      lineCode,
      mode: 'fgc' as const,
      operator: 'fgc' as const,
      points: stations.map(({ lat, lon }) => ({ lat, lon })),
    }],
  ]),
);

const mockTramLines: Line[] = [
  {
    code: 'T3',
    name: 'Sant Feliu | Consell Comarcal - Francesc Macià',
    mode: 'tram',
    operator: 'tram',
    vehicleMode: 'tram',
    network: 'trambaix',
    color: '0074E8',
    originStation: 'Sant Feliu | Consell Comarcal',
    destinationStation: 'Francesc Macià',
  },
  {
    code: 'T4',
    name: 'Ciutadella | Vila Olímpica - Estació de Sant Adrià',
    mode: 'tram',
    operator: 'tram',
    vehicleMode: 'tram',
    network: 'trambesos',
    color: '008080',
    originStation: 'Ciutadella | Vila Olímpica',
    destinationStation: 'Estació de Sant Adrià',
  },
];

const mockTramStationsByLine: Record<string, Station[]> = {
  T3: [
    { code: 'T3-FM', lineCode: 'T3', mode: 'tram', operator: 'tram', vehicleMode: 'tram', network: 'trambaix', name: 'Francesc Macià', lat: 41.39214, lon: 2.14367, order: 1 },
    { code: 'T3-MC', lineCode: 'T3', mode: 'tram', operator: 'tram', vehicleMode: 'tram', network: 'trambaix', name: 'Maria Cristina', lat: 41.38808, lon: 2.12981, order: 2 },
    { code: 'T3-PZ', lineCode: 'T3', mode: 'tram', operator: 'tram', vehicleMode: 'tram', network: 'trambaix', name: 'Palau Reial', lat: 41.38383, lon: 2.11812, order: 3 },
  ],
  T4: [
    { code: 'T4-CV', lineCode: 'T4', mode: 'tram', operator: 'tram', vehicleMode: 'tram', network: 'trambesos', name: 'Ciutadella | Vila Olímpica', lat: 41.38782, lon: 2.19305, order: 1 },
    { code: 'T4-GR', lineCode: 'T4', mode: 'tram', operator: 'tram', vehicleMode: 'tram', network: 'trambesos', name: 'Glòries', lat: 41.40255, lon: 2.18809, order: 2 },
    { code: 'T4-SA', lineCode: 'T4', mode: 'tram', operator: 'tram', vehicleMode: 'tram', network: 'trambesos', name: 'Estació de Sant Adrià', lat: 41.42449, lon: 2.23059, order: 3 },
  ],
};

const mockTramSegmentsByLine: Record<string, Segment[]> = Object.fromEntries(
  Object.entries(mockTramStationsByLine).map(([lineCode, stations]) => [
    lineCode,
    [{
      id: `tram-${lineCode.toLowerCase()}-segment`,
      lineCode,
      mode: 'tram' as const,
      operator: 'tram' as const,
      points: stations.map(({ lat, lon }) => ({ lat, lon })),
    }],
  ]),
);

const mockServiceAlerts: ServiceAlert[] = [
  {
    id: 'mock:l4-verdaguer',
    title: 'L4: estació Verdaguer fora de servei',
    description: 'Estació Verdaguer (L4) tancada temporalment per obres de millora.',
    mode: 'metro',
    severity: 'disruption',
    kind: 'planned',
    affectedLines: [{ mode: 'metro', code: 'L4' }],
    source: 'tmb-service-notices',
    dateLabel: 'Del 06/07/2026 al 30/08/2026',
  },
  {
    id: 'mock:tour-france',
    title: 'Afectacions per la sortida del Tour de France',
    description: 'Desviaments puntuals a diverses línies de bus i afectacions al servei de metro.',
    mode: 'mixed',
    severity: 'warning',
    kind: 'planned',
    affectedLines: [
      { mode: 'bus', code: 'D20' },
      { mode: 'bus', code: 'H8' },
      { mode: 'metro', code: 'L2' },
    ],
    source: 'tmb-service-notices',
    dateLabel: 'Del 05/07/2026 al 06/07/2026',
  },
  {
    id: 'mock:metro-operational',
    title: 'PP1 Servei parcial',
    description: 'Afectacions a les línies L9 Nord i L10 Nord per obres de millora.',
    mode: 'metro',
    severity: 'warning',
    kind: 'current',
    affectedLines: [
      { mode: 'metro', code: 'L9N' },
      { mode: 'metro', code: 'L10N' },
    ],
    source: 'tmb-alerts-api',
    dateLabel: '25/06/2026 - 30/08/2026',
  },
  {
    id: 'mock:tram-alteration',
    title: 'T4, T5 and T6 service alteration',
    description: 'Temporary changes to tram service due to infrastructure works.',
    mode: 'tram',
    operator: 'tram',
    severity: 'warning',
    kind: 'current',
    affectedLines: [
      { mode: 'tram', code: 'T4' },
      { mode: 'tram', code: 'T5' },
      { mode: 'tram', code: 'T6' },
    ],
    source: 'tram-alterations',
    sourceUrl: 'https://www.tram.cat',
  },
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
  if (mode === 'tram') {
    return mockTramLines;
  }
  if (mode === 'fgc') {
    return mockFgcLines;
  }
  if (mode === 'bus') {
    return mockBusLines;
  }

  return mockMetroLines;
}

export async function fetchLineStationsFromMock(
  mode: TransportMode,
  lineCode: string,
): Promise<Station[]> {
  if (mode === 'tram') {
    return mockTramStationsByLine[lineCode] ?? [];
  }
  if (mode === 'fgc') {
    return mockFgcStationsByLine[lineCode] ?? [];
  }
  if (mode === 'bus') {
    return mockBusStationsByLine[lineCode] ?? [];
  }

  return mockMetroStationsByLine[lineCode] ?? [];
}

export async function fetchLineSegmentsFromMock(
  mode: TransportMode,
  lineCode: string,
): Promise<Segment[]> {
  if (mode === 'tram') {
    return mockTramSegmentsByLine[lineCode] ?? [];
  }
  if (mode === 'fgc') {
    return mockFgcSegmentsByLine[lineCode] ?? [];
  }
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

  if (mode === 'tram') {
    return [
      {
        lineCode,
        stationCode,
        mode,
        operator: 'tram',
        directionId: 'outbound',
        platformCode: '1',
        destination: 'Francesc Macià',
        etaSec: 150,
        sourceTimestampMs,
        serviceId: 'mock-tram-1',
        realtimeStatus: 'realtime',
      },
      {
        lineCode,
        stationCode,
        mode,
        operator: 'tram',
        directionId: 'outbound',
        platformCode: '1',
        destination: 'Francesc Macià',
        etaSec: 690,
        sourceTimestampMs,
        serviceId: 'mock-tram-2',
        realtimeStatus: 'scheduled',
      },
    ];
  }

  if (mode === 'fgc') {
    return [
      {
        lineCode,
        stationCode,
        mode,
        operator: 'fgc',
        directionId: 'Terrassa Nacions Unides',
        platformCode: '1',
        destination: 'Terrassa Nacions Unides',
        etaSec: 180,
        sourceTimestampMs,
        serviceId: 'mock-fgc-1',
        realtimeStatus: 'realtime',
      },
      {
        lineCode,
        stationCode,
        mode,
        operator: 'fgc',
        directionId: 'Terrassa Nacions Unides',
        platformCode: '1',
        destination: 'Terrassa Nacions Unides',
        etaSec: 720,
        sourceTimestampMs,
        realtimeStatus: 'scheduled',
      },
    ];
  }

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

export async function fetchServiceAlertsFromMock(): Promise<ServiceAlert[]> {
  return mockServiceAlerts;
}

function haversineDistanceMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const x = sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

export async function fetchNearbyStopsFromMock(
  center: LatLng,
  modes: TransportMode[],
  radiusMeters: number,
): Promise<NearbyStop[]> {
  const linesByMode: Record<TransportMode, Line[]> = {
    metro: mockMetroLines,
    bus: mockBusLines,
    fgc: mockFgcLines,
    tram: mockTramLines,
  };
  const stationsByLine: Record<TransportMode, Record<string, Station[]>> = {
    metro: mockMetroStationsByLine,
    bus: mockBusStationsByLine,
    fgc: mockFgcStationsByLine,
    tram: mockTramStationsByLine,
  };

  const seen = new Set<string>();
  const result: NearbyStop[] = [];

  for (const mode of modes) {
    for (const line of linesByMode[mode]) {
      for (const station of stationsByLine[mode][line.code] ?? []) {
        if (seen.has(station.code)) {
          continue;
        }
        seen.add(station.code);

        const distanceMeters = haversineDistanceMeters(center, station);
        if (distanceMeters <= radiusMeters) {
          result.push({ ...station, lineColor: line.color, distanceMeters });
        }
      }
    }
  }

  return result.sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export async function fetchPlannedRoutesFromMock(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
): Promise<PlannedRoute[]> {
  const directPoints = [from, { lat: 41.3905, lon: 2.1733 }, { lat: 41.395, lon: 2.1768 }, to];
  const metroPoints = [from, { lat: 41.3785, lon: 2.1407 }, { lat: 41.3764, lon: 2.1431 }, to];

  return [
    {
      id: 'mock-route-bus',
      durationSec: 23 * 60,
      walkDistanceMeters: 420,
      transfers: 0,
      legs: [
        {
          id: 'mock-route-bus-leg-walk-start',
          mode: 'walk',
          from: { name: 'Origin', ...from },
          to: { name: 'Urquinaona', lat: 41.3905, lon: 2.1733 },
          durationSec: 4 * 60,
          distanceMeters: 260,
          points: directPoints.slice(0, 2),
        },
        {
          id: 'mock-route-bus-leg-v19',
          mode: 'transit',
          route: 'V19',
          routeLongName: 'Sant Genis',
          agencyName: 'TMB',
          from: { name: 'Urquinaona', lat: 41.3905, lon: 2.1733 },
          to: { name: 'Pg. de Sant Joan', lat: 41.395, lon: 2.1768 },
          durationSec: 15 * 60,
          points: directPoints.slice(1, 3),
        },
        {
          id: 'mock-route-bus-leg-walk-end',
          mode: 'walk',
          from: { name: 'Pg. de Sant Joan', lat: 41.395, lon: 2.1768 },
          to: { name: 'Destination', ...to },
          durationSec: 4 * 60,
          distanceMeters: 160,
          points: directPoints.slice(2),
        },
      ],
    },
    {
      id: 'mock-route-metro',
      durationSec: 29 * 60,
      walkDistanceMeters: 610,
      transfers: 1,
      legs: [
        {
          id: 'mock-route-metro-leg-walk-start',
          mode: 'walk',
          from: { name: 'Origin', ...from },
          to: { name: 'Sants Estacio', lat: 41.3785, lon: 2.1407 },
          durationSec: 6 * 60,
          distanceMeters: 420,
          points: metroPoints.slice(0, 2),
        },
        {
          id: 'mock-route-metro-leg-l3',
          mode: 'transit',
          route: 'L3',
          routeLongName: 'Zona Universitaria - Trinitat Nova',
          agencyName: 'TMB',
          from: { name: 'Sants Estacio', lat: 41.3785, lon: 2.1407 },
          to: { name: 'Tarragona', lat: 41.3764, lon: 2.1431 },
          durationSec: 17 * 60,
          points: metroPoints.slice(1, 3),
        },
        {
          id: 'mock-route-metro-leg-walk-end',
          mode: 'walk',
          from: { name: 'Tarragona', lat: 41.3764, lon: 2.1431 },
          to: { name: 'Destination', ...to },
          durationSec: 6 * 60,
          distanceMeters: 190,
          points: metroPoints.slice(2),
        },
      ],
    },
  ];
}
