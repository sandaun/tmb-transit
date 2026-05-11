import { env } from '../config/env';
import { devLogRawOnce } from '../utils/raw-log';
import type { ArrivalDto } from '../types/api';

interface IBusEntryRaw {
  line?: string | number;
  routeId?: string | number;
  'route-id'?: string | number;
  destination?: string;
  'text-ca'?: string;
  'text-en'?: string;
  'text-es'?: string;
  'in-vehicle-time'?: number;
  't-in-min'?: number;
  't-in-s'?: number;
  temps_arribada?: number;
  'next-text-ca'?: string;
  'next-text-en'?: string;
}

interface IBusResponseRaw {
  data?: {
    ibus?: IBusEntryRaw[];
  };
}

function asString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return String(value);
}

function pickDestination(entry: IBusEntryRaw): string {
  return (
    entry.destination ??
    entry['text-en'] ??
    entry['text-ca'] ??
    entry['text-es'] ??
    'Unknown destination'
  );
}

function parseEtaFromText(text: string | undefined): number | null {
  if (!text) {
    return null;
  }

  const minutes = text.match(/(\d+)\s*min/i);
  if (minutes) {
    return Math.max(0, parseInt(minutes[1], 10) * 60);
  }

  const seconds = text.match(/(\d+)\s*s(?:ec)?/i);
  if (seconds) {
    return Math.max(0, parseInt(seconds[1], 10));
  }

  if (/imminent/i.test(text)) {
    return 0;
  }

  return null;
}

function parseEtaSec(entry: IBusEntryRaw): number {
  if (typeof entry['t-in-s'] === 'number') {
    return Math.max(0, Math.round(entry['t-in-s']));
  }
  if (typeof entry['in-vehicle-time'] === 'number') {
    const value = entry['in-vehicle-time'];
    return Math.max(0, Math.round(value > 1000 ? value / 1000 : value));
  }
  if (typeof entry['t-in-min'] === 'number') {
    return Math.max(0, Math.round(entry['t-in-min'] * 60));
  }
  if (typeof entry.temps_arribada === 'number') {
    const now = Date.now();
    return Math.max(0, Math.floor((entry.temps_arribada - now) / 1000));
  }

  const fromCa = parseEtaFromText(entry['text-ca']);
  if (fromCa !== null) return fromCa;
  const fromEn = parseEtaFromText(entry['text-en']);
  if (fromEn !== null) return fromEn;
  const fromEs = parseEtaFromText(entry['text-es']);
  if (fromEs !== null) return fromEs;

  return 0;
}

/**
 * Fetch real-time bus arrivals for a stop.
 *
 * TMB's `/v1/ibus/lines/{lineCode}/stops/{stop}` filter endpoint is unreliable
 * (returns empty results regardless of the line identifier we pass), so we
 * always query `/v1/ibus/stops/{stop}` and filter client-side by the display
 * line code, which is what the response actually contains.
 */
export async function fetchBusArrivalsByStation(
  stationCode: string,
  lineDisplayCode?: string,
): Promise<ArrivalDto[]> {
  const url = new URL(
    `${env.iBusBaseUrl}/stops/${encodeURIComponent(stationCode)}`,
  );
  url.searchParams.set('app_id', env.tmbAppId);
  url.searchParams.set('app_key', env.tmbAppKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`iBus API failed with status ${response.status}`);
  }

  const payload = (await response.json()) as IBusResponseRaw;
  devLogRawOnce(`ibus:${stationCode}`, payload);

  const sourceTimestampMs = Date.now();
  const entries = payload.data?.ibus ?? [];

  const normalizedFilter = lineDisplayCode?.trim().toUpperCase();

  const arrivals: ArrivalDto[] = entries
    .filter((entry) => {
      if (!normalizedFilter) {
        return true;
      }
      const entryLine = asString(entry.line)?.trim().toUpperCase();
      return entryLine === normalizedFilter;
    })
    .map((entry, index) => ({
      lineCode: asString(entry.line) ?? lineDisplayCode ?? '',
      stationCode,
      mode: 'bus' as const,
      directionId: asString(entry['route-id'] ?? entry.routeId) ?? `${index}`,
      destination: pickDestination(entry),
      etaSec: parseEtaSec(entry),
      sourceTimestampMs,
      serviceId: asString(entry['route-id'] ?? entry.routeId),
    }));

  arrivals.sort((a, b) => a.etaSec - b.etaSec);
  return arrivals;
}
