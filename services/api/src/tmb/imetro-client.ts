import { env } from '../config/env';
import { devLogRawOnce } from '../utils/raw-log';

interface IMetroTrainRaw {
  codi_servei?: string;
  temps_arribada?: number;
}

interface IMetroPathRaw {
  codi_linia?: number | string;
  nom_linia?: string;
  color_linia?: string;
  codi_trajecte?: string;
  desti_trajecte?: string;
  propers_trens?: IMetroTrainRaw[];
}

interface IMetroStationRaw {
  codi_via?: number | string;
  id_sentit?: number | string;
  codi_estacio?: number | string;
  linies_trajectes?: IMetroPathRaw[];
}

interface IMetroLineRaw {
  codi_linia?: number | string;
  nom_linia?: string;
  estacions?: IMetroStationRaw[];
}

interface IMetroResponseRaw {
  timestamp?: number;
  linies?: IMetroLineRaw[];
}

export interface ParsedIMetroArrival {
  lineCode: string;
  stationCode: string;
  directionId: string;
  platformCode?: string;
  destination: string;
  serviceId?: string;
  etaSec: number;
  sourceTimestampMs: number;
}

function normalizeCode(value: string | number | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  return String(value);
}

function normalizeLineCode(value: string): string {
  return value.trim().toUpperCase().replace(/^L/, '');
}

export async function fetchArrivalsByStation(
  stationCode: string,
  lineCodeFilter: string,
): Promise<ParsedIMetroArrival[]> {
  const url = new URL(`${env.iMetroBaseUrl}/metro/estacions`);
  url.searchParams.set('estacions', stationCode);
  url.searchParams.set('app_id', env.tmbAppId);
  url.searchParams.set('app_key', env.tmbAppKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`iMetro API failed with status ${response.status}`);
  }

  const payload = (await response.json()) as IMetroResponseRaw;
  devLogRawOnce(`imetro:${stationCode}`, payload);

  const now = Date.now();
  const sourceTimestampMs = payload.timestamp ?? now;
  const normalizedFilter = normalizeLineCode(lineCodeFilter);
  const arrivals: ParsedIMetroArrival[] = [];

  for (const line of payload.linies ?? []) {
    const lineCode = normalizeCode(line.codi_linia);
    if (!lineCode || normalizeLineCode(lineCode) !== normalizedFilter) {
      continue;
    }

    for (const station of line.estacions ?? []) {
      const stationCodeValue = normalizeCode(station.codi_estacio);
      if (!stationCodeValue || stationCodeValue !== stationCode) {
        continue;
      }

      for (const path of station.linies_trajectes ?? []) {
        const directionId = normalizeCode(station.id_sentit) ?? '1';
        const platformCode = normalizeCode(station.codi_via) ?? undefined;
        const destination = path.desti_trajecte ?? 'Unknown destination';

        for (const train of path.propers_trens ?? []) {
          if (typeof train.temps_arribada !== 'number') {
            continue;
          }

          const etaSec = Math.max(0, Math.floor((train.temps_arribada - now) / 1_000));

          arrivals.push({
            lineCode: lineCodeFilter,
            stationCode,
            directionId,
            platformCode,
            destination,
            serviceId: train.codi_servei,
            etaSec,
            sourceTimestampMs,
          });
        }
      }
    }
  }

  return arrivals.sort((a, b) => a.etaSec - b.etaSec);
}
