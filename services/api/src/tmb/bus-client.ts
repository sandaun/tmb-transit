import { env } from '../config/env';
import { devLogRawOnce } from '../utils/raw-log';
import {
  getNumber,
  getString,
  toLatLonFromPoint,
  toLinePoints,
  type GeoFeature,
  type GeoFeatureCollection,
} from './helpers';
import type { LineDto, SegmentDto, StationDto } from '../types/api';

function buildUrl(path: string): string {
  const url = new URL(`${env.transitBaseUrl}${path}`);
  url.searchParams.set('app_id', env.tmbAppId);
  url.searchParams.set('app_key', env.tmbAppKey);
  return url.toString();
}

async function fetchCollection(path: string, logKey: string): Promise<GeoFeatureCollection> {
  const response = await fetch(buildUrl(path));
  if (!response.ok) {
    throw new Error(`Transit (bus) API failed with status ${response.status} for ${path}`);
  }

  const payload = (await response.json()) as GeoFeatureCollection;
  devLogRawOnce(logKey, payload);
  return payload;
}

function readBusDisplayCode(props: Record<string, unknown>): string | undefined {
  return getString(props, ['NOM_LINIA', 'nom_linia', 'CODI_LINIA', 'codi_linia']);
}

function readBusInternalId(props: Record<string, unknown>): string | undefined {
  return getString(props, ['CODI_LINIA', 'codi_linia', 'ID_LINIA', 'id_linia']);
}

function mapBusLineFeature(feature: GeoFeature): LineDto | null {
  const props = feature.properties ?? {};
  const code = readBusDisplayCode(props);
  if (!code) {
    return null;
  }

  return {
    code,
    name: getString(props, ['DESC_LINIA', 'desc_linia', 'NOM_LINIA', 'nom_linia']) ?? code,
    color: getString(props, ['COLOR_LINIA', 'color_linia']),
    mode: 'bus',
    originStation: getString(props, ['ORIGEN_LINIA', 'origen_linia']),
    destinationStation: getString(props, ['DESTI_LINIA', 'desti_linia']),
  };
}

interface BusLineLookupEntry {
  internalId: string;
  displayCode: string;
}

let lineLookupCache: { fetchedAt: number; entries: BusLineLookupEntry[] } | null = null;
const LINE_LOOKUP_TTL_MS = 24 * 60 * 60 * 1000;

async function getLineLookup(): Promise<BusLineLookupEntry[]> {
  const now = Date.now();
  if (lineLookupCache && now - lineLookupCache.fetchedAt < LINE_LOOKUP_TTL_MS) {
    return lineLookupCache.entries;
  }

  const collection = await fetchCollection('/linies/bus', 'transit:linies-bus:lookup');
  const entries: BusLineLookupEntry[] = [];

  for (const feature of collection.features ?? []) {
    const props = feature.properties ?? {};
    const internalId = readBusInternalId(props);
    const displayCode = readBusDisplayCode(props);
    if (!internalId || !displayCode) {
      continue;
    }

    entries.push({ internalId, displayCode });
  }

  lineLookupCache = { fetchedAt: now, entries };
  return entries;
}

async function resolveBusLineId(displayOrInternal: string): Promise<string> {
  const trimmed = displayOrInternal.trim();
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  const lookup = await getLineLookup();
  const match = lookup.find(
    (entry) => entry.displayCode.toUpperCase() === trimmed.toUpperCase(),
  );

  if (!match) {
    throw new Error(`Unknown bus line code: ${displayOrInternal}`);
  }

  return match.internalId;
}

export async function getBusLines(): Promise<LineDto[]> {
  const collection = await fetchCollection('/linies/bus', 'transit:linies-bus');
  const features = collection.features ?? [];
  const lines: LineDto[] = [];

  for (const feature of features) {
    const line = mapBusLineFeature(feature);
    if (line) {
      lines.push(line);
    }
  }

  return lines.sort((a, b) =>
    a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }),
  );
}

export async function getBusLineStations(lineCode: string): Promise<StationDto[]> {
  const internalId = await resolveBusLineId(lineCode);
  const collection = await fetchCollection(
    `/linies/bus/${encodeURIComponent(internalId)}/parades`,
    `transit:bus:parades:${internalId}`,
  );

  const features = collection.features ?? [];
  const seen = new Set<string>();
  const stations: StationDto[] = [];

  for (const feature of features) {
    const props = feature.properties ?? {};
    const point = toLatLonFromPoint(feature.geometry);
    if (!point) {
      continue;
    }

    const code = getString(props, ['CODI_PARADA', 'codi_parada', 'ID_PARADA', 'id_parada']);
    if (!code || seen.has(code)) {
      continue;
    }
    seen.add(code);

    stations.push({
      code,
      lineCode,
      mode: 'bus',
      name: getString(props, ['NOM_PARADA', 'nom_parada', 'DESC_PARADA']) ?? `Parada ${code}`,
      lat: point.lat,
      lon: point.lon,
      order: getNumber(props, ['ORDRE', 'ordre', 'ORDRE_PARADA', 'ordre_parada']),
      serviceDescription: getString(props, ['ADRECA', 'adreca']),
    });
  }

  stations.sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined && a.order !== b.order) {
      return a.order - b.order;
    }
    return a.name.localeCompare(b.name);
  });

  return stations;
}

export async function getBusLineSegments(lineCode: string): Promise<SegmentDto[]> {
  const internalId = await resolveBusLineId(lineCode);
  const collection = await fetchCollection(
    `/linies/bus/${encodeURIComponent(internalId)}`,
    `transit:bus:line:${internalId}`,
  ).catch(() => null);

  const features = collection?.features ?? [];
  const segments: SegmentDto[] = [];

  for (let index = 0; index < features.length; index += 1) {
    const feature = features[index];
    const points = toLinePoints(feature.geometry);
    if (points.length < 2) {
      continue;
    }

    const segmentId = getString(feature.properties ?? {}, ['CODI_TRAJECTE', 'codi_trajecte']) ?? `${lineCode}-${index}`;

    segments.push({
      id: segmentId,
      lineCode,
      mode: 'bus',
      points,
    });
  }

  return segments;
}

export async function resolveBusLineInternalId(displayCode: string): Promise<string> {
  return resolveBusLineId(displayCode);
}
