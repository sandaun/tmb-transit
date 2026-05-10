import { env } from '../config/env';
import { devLogRawOnce } from '../utils/raw-log';
import { resolveBusLineInternalId } from './bus-client';
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

export async function fetchBusArrivalsByStation(
  stationCode: string,
  lineDisplayCode?: string,
): Promise<ArrivalDto[]> {
  const internalId = lineDisplayCode ? await resolveBusLineInternalId(lineDisplayCode) : undefined;
  const path = internalId
    ? `/lines/${encodeURIComponent(internalId)}/stops/${encodeURIComponent(stationCode)}`
    : `/stops/${encodeURIComponent(stationCode)}`;

  const url = new URL(`${env.iBusBaseUrl}${path}`);
  url.searchParams.set('app_id', env.tmbAppId);
  url.searchParams.set('app_key', env.tmbAppKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`iBus API failed with status ${response.status}`);
  }

  const payload = (await response.json()) as IBusResponseRaw;
  devLogRawOnce(`ibus:${stationCode}:${internalId ?? 'all'}`, payload);

  const sourceTimestampMs = Date.now();
  const entries = payload.data?.ibus ?? [];

  const arrivals: ArrivalDto[] = entries
    .filter((entry) => {
      if (!internalId) {
        return true;
      }
      return asString(entry.line) === internalId;
    })
    .map((entry, index) => ({
      lineCode: lineDisplayCode ?? asString(entry.line) ?? '',
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
