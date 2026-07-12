import type { Line, Station } from '@/src/domain/catalog/models';

export interface StationInterchangeMember {
  line: Line;
  station: Station;
}

export interface StationInterchange {
  id: string;
  name: string;
  lat: number;
  lon: number;
  members: StationInterchangeMember[];
}

const MAX_INTERCHANGE_DISTANCE_M = 360;

function normalizeStationName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getDistanceMeters(a: Station, b: Station): number {
  const latMeters = (a.lat - b.lat) * 111_320;
  const lonMeters =
    (a.lon - b.lon) *
    111_320 *
    Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);

  return Math.hypot(latMeters, lonMeters);
}

function getInterchangeId(name: string, lat: number, lon: number): string {
  return [
    normalizeStationName(name).replace(/\s+/g, '-'),
    lat.toFixed(4),
    lon.toFixed(4),
  ].join(':');
}

export function buildStationInterchanges(
  lines: Line[],
  stationsByLine: ReadonlyMap<string, Station[]>,
): StationInterchange[] {
  const lineByCode = new Map(lines.map((line) => [line.code, line]));
  const groups: StationInterchangeMember[][] = [];

  for (const line of lines) {
    const stations = stationsByLine.get(line.code) ?? [];

    for (const station of stations) {
      const normalizedName = normalizeStationName(station.name);
      const matchingGroup = groups.find((group) => {
        const firstStation = group[0]?.station;

        if (!firstStation) {
          return false;
        }

        return (
          normalizeStationName(firstStation.name) === normalizedName &&
          getDistanceMeters(firstStation, station) <= MAX_INTERCHANGE_DISTANCE_M
        );
      });

      const member = {
        line: lineByCode.get(station.lineCode) ?? line,
        station,
      };

      if (matchingGroup) {
        matchingGroup.push(member);
      } else {
        groups.push([member]);
      }
    }
  }

  return groups.map((members) => {
    const firstStation = members[0].station;
    const lat =
      members.reduce((sum, member) => sum + member.station.lat, 0) /
      members.length;
    const lon =
      members.reduce((sum, member) => sum + member.station.lon, 0) /
      members.length;

    return {
      id: getInterchangeId(firstStation.name, lat, lon),
      name: firstStation.name,
      lat,
      lon,
      members: members.sort((a, b) => a.line.code.localeCompare(b.line.code)),
    };
  });
}

export function findStationInterchange(
  interchanges: StationInterchange[],
  lineCode: string | null,
  stationCode: string | null,
): StationInterchange | null {
  if (!lineCode || !stationCode) {
    return null;
  }

  return (
    interchanges.find((interchange) =>
      interchange.members.some(
        (member) =>
          member.line.code === lineCode && member.station.code === stationCode,
      ),
    ) ?? null
  );
}

export function prioritizeSelectedInterchangeMember(
  members: StationInterchangeMember[],
  lineCode: string | null,
): StationInterchangeMember[] {
  const selectedIndex = members.findIndex((member) => member.line.code === lineCode);

  if (selectedIndex <= 0) {
    return members;
  }

  return [
    members[selectedIndex],
    ...members.slice(0, selectedIndex),
    ...members.slice(selectedIndex + 1),
  ];
}

export function getUniqueInterchangeLines(
  members: StationInterchangeMember[],
): Line[] {
  const seenLineKeys = new Set<string>();

  return members.flatMap((member) => {
    const lineKey = `${member.line.mode}:${member.line.code}`;
    if (seenLineKeys.has(lineKey)) {
      return [];
    }

    seenLineKeys.add(lineKey);
    return [member.line];
  });
}

export function prioritizeSelectedInterchangeLine(
  lines: Line[],
  mode: Line['mode'],
  lineCode: string,
): Line[] {
  const selectedIndex = lines.findIndex(
    (line) => line.mode === mode && line.code === lineCode,
  );

  if (selectedIndex <= 0) {
    return lines;
  }

  return [
    lines[selectedIndex],
    ...lines.slice(0, selectedIndex),
    ...lines.slice(selectedIndex + 1),
  ];
}
