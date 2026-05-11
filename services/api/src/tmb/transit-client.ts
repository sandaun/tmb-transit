import { env } from '../config/env';
import { devLogRawOnce } from '../utils/raw-log';
import {
  getNumber,
  getString,
  toLatLonFromPoint,
  toLinePoints,
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
    throw new Error(`Transit API failed with status ${response.status}`);
  }

  const payload = (await response.json()) as GeoFeatureCollection;
  devLogRawOnce(logKey, payload);
  return payload;
}

function normalizeLineCode(lineCode: string): string {
  return lineCode.trim().toUpperCase().replace(/^L/, '');
}

async function fetchLineCollection(
  pathBuilder: (lineCode: string) => string,
  lineCode: string,
  logKey: string,
): Promise<GeoFeatureCollection> {
  try {
    return await fetchCollection(pathBuilder(lineCode), `${logKey}:${lineCode}`);
  } catch (firstError) {
    const normalized = normalizeLineCode(lineCode);
    if (normalized === lineCode) {
      throw firstError;
    }

    return fetchCollection(pathBuilder(normalized), `${logKey}:${normalized}`);
  }
}

export async function getMetroLines(): Promise<LineDto[]> {
  const collection = await fetchCollection('/linies/metro', 'transit:linies-metro');
  const features = collection.features ?? [];
  const lines: LineDto[] = [];

  for (const feature of features) {
    const props = feature.properties ?? {};
    const code = getString(props, ['CODI_LINIA', 'codi_linia', 'ID_LINIA', 'id_linia']);
    const name = getString(props, ['NOM_LINIA', 'nom_linia', 'DESC_LINIA']);
    if (!code) {
      continue;
    }

    lines.push({
      code,
      name: name ?? `L${code}`,
      color: getString(props, ['COLOR_LINIA', 'color_linia']),
      mode: 'metro',
      originStation: getString(props, ['ORIGEN_LINIA', 'origen_linia']),
      destinationStation: getString(props, ['DESTI_LINIA', 'desti_linia']),
    });
  }

  return lines.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
}

export async function getMetroLineStations(lineCode: string): Promise<StationDto[]> {
  const collection = await fetchLineCollection(
    (value) => `/linies/metro/${encodeURIComponent(value)}/estacions`,
    lineCode,
    'transit:line:estacions',
  );

  const features = collection.features ?? [];
  const stations: StationDto[] = [];

  for (const feature of features) {
    const props = feature.properties ?? {};
    const point = toLatLonFromPoint(feature.geometry);
    if (!point) {
      continue;
    }

    const code = getString(props, [
      'CODI_ESTACIO',
      'codi_estacio',
      'CODI_GRUP_ESTACIO',
      'codi_grup_estacio',
    ]);

    if (!code) {
      continue;
    }

    stations.push({
      code,
      lineCode,
      mode: 'metro',
      name: getString(props, ['NOM_ESTACIO', 'nom_estacio', 'DESC_ESTACIO']) ?? `Estació ${code}`,
      lat: point.lat,
      lon: point.lon,
      order: getNumber(props, ['ORDRE_ESTACIO', 'ordre_estacio', 'ORDRE', 'ordre']),
      accessibilityTypeId: getNumber(props, [
        'ID_TIPUS_ACCESSIBILITAT',
        'id_tipus_accessibilitat',
      ]),
      accessibilityLabel: getString(props, [
        'NOM_TIPUS_ACCESSIBILITAT',
        'nom_tipus_accessibilitat',
      ]),
      statusTypeId: getNumber(props, ['ID_TIPUS_ESTAT', 'id_tipus_estat']),
      statusLabel: getString(props, ['NOM_TIPUS_ESTAT', 'nom_tipus_estat']),
      serviceDescription: getString(props, ['DESC_SERVEI', 'desc_servei']),
      serviceOrigin: getString(props, ['ORIGEN_SERVEI', 'origen_servei']),
      serviceDestination: getString(props, ['DESTI_SERVEI', 'desti_servei']),
    });
  }

  return stations.sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined && a.order !== b.order) {
      return a.order - b.order;
    }

    return a.name.localeCompare(b.name);
  });
}

export async function getMetroLineSegments(lineCode: string): Promise<SegmentDto[]> {
  const collection = await fetchLineCollection(
    (value) => `/linies/metro/${encodeURIComponent(value)}/trams`,
    lineCode,
    'transit:line:trams',
  );

  const features = collection.features ?? [];
  const segments: SegmentDto[] = [];

  for (let index = 0; index < features.length; index += 1) {
    const feature = features[index];
    const props = feature.properties ?? {};
    const points = toLinePoints(feature.geometry);
    if (points.length < 2) {
      continue;
    }

    const segmentId =
      getString(props, ['CODI_TRAM', 'codi_tram', 'ID_TRAM', 'id_tram']) ??
      `${lineCode}-segment-${index}`;

    segments.push({
      id: segmentId,
      lineCode,
      mode: 'metro',
      fromStationCode: getString(props, ['CODI_ESTACIO_ORIGEN', 'codi_estacio_origen']),
      toStationCode: getString(props, ['CODI_ESTACIO_DESTI', 'codi_estacio_desti']),
      points,
    });
  }

  return segments;
}
