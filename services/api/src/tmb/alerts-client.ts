import { env } from '../config/env';
import { fetchWithTimeout } from './http';
import type {
  ServiceAlertDto,
  ServiceAlertLineDto,
  ServiceAlertSeverity,
  TransportMode,
} from '../types/api';

type LocalizedPublication = Partial<Record<'headerCa' | 'headerEs' | 'headerEn' | 'textCa' | 'textEs' | 'textEn', string>> & {
  begin_date?: number;
  end_date?: number;
};

interface TmbAlertsEnvelope<TAlert> {
  status?: string;
  data?: {
    alerts?: TAlert[];
  };
}

interface MetroAlertEntity {
  line_code?: string | number;
  line_name?: string;
}

interface MetroAlertRaw {
  categories?: {
    effect_status?: string;
    effect_type?: string;
  };
  disruption_dates?: {
    begin_date?: number;
    end_date?: number;
  }[];
  effect?: {
    status?: string;
    type?: string;
  };
  entities?: MetroAlertEntity[];
  id?: string | number;
  publications?: LocalizedPublication[];
  tstamp?: number;
}

interface BusAlertLineRaw {
  commercialLineId?: string | number;
  lineId?: string | number;
}

interface BusAlertRaw {
  begin?: number;
  categories?: {
    messageType?: string;
  };
  causeName?: string;
  channelInfoTO?: Partial<Record<'textCa' | 'textEs' | 'textEn', string>> & {
    begin?: number;
    end?: number;
    modified?: number;
  };
  end?: number;
  id?: string | number;
  linesAffected?: BusAlertLineRaw[];
  modified?: number;
  scheduled?: boolean;
  typeName?: string;
}

const METRO_LINE_CODES_BY_ID: Record<string, string> = {
  '1': 'L1',
  '2': 'L2',
  '3': 'L3',
  '4': 'L4',
  '5': 'L5',
  '11': 'L11',
  '91': 'L9S',
  '94': 'L9N',
  '99': 'FM',
  '101': 'L10S',
  '104': 'L10N',
};

function buildAlertsUrl(mode: TransportMode): string {
  const url = new URL(`${env.alertsBaseUrl}/${mode}/channels/WEB`);
  url.searchParams.set('app_id', env.tmbAppId);
  url.searchParams.set('app_key', env.tmbAppKey);
  return url.toString();
}

function cleanText(value: string | undefined): string {
  return (value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickLocalizedText(publication: LocalizedPublication | undefined, field: 'header' | 'text'): string {
  if (!publication) {
    return '';
  }

  return cleanText(
    publication[`${field}Ca`] ??
      publication[`${field}Es`] ??
      publication[`${field}En`],
  );
}

function cleanMetroAlertTitle(title: string): string {
  return title.replace(/^PP\d+\s+/i, '').trim();
}

function normalizeMetroLineCode(lineCode: string | number | undefined, lineName?: string): string | null {
  const name = lineName?.trim().toUpperCase().replace(/\s+/g, '');
  if (name && /^(?:L\d{1,2}[NS]?|FM)$/.test(name)) {
    return name;
  }

  if (lineCode === undefined) {
    return null;
  }

  const code = String(lineCode).trim().toUpperCase().replace(/\s+/g, '');
  return METRO_LINE_CODES_BY_ID[code] ?? (code.startsWith('L') ? code : `L${code}`);
}

function dedupeLines(lines: ServiceAlertLineDto[]): ServiceAlertLineDto[] {
  const seen = new Set<string>();
  const result: ServiceAlertLineDto[] = [];

  for (const line of lines) {
    const key = `${line.mode}:${line.code}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(line);
  }

  return result;
}

function mapStatusToSeverity(status: string | undefined, text: string): ServiceAlertSeverity {
  const normalizedStatus = status?.toLowerCase();
  const normalizedText = text.toLowerCase();

  if (
    normalizedStatus === 'danger' ||
    /sense servei|sin servicio|fora de servei|fuera de servicio|servei parcial|no funcionar|anul/.test(
      normalizedText,
    )
  ) {
    return 'disruption';
  }

  if (normalizedStatus === 'warning' || /alteraci|afectaci|desvi|obres|obras|manten/.test(normalizedText)) {
    return 'warning';
  }

  return 'info';
}

function dateLabel(startsAtMs: number | undefined, endsAtMs: number | undefined): string | undefined {
  if (!startsAtMs && !endsAtMs) {
    return undefined;
  }

  const formatter = new Intl.DateTimeFormat('ca-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  if (startsAtMs && endsAtMs) {
    return `${formatter.format(new Date(startsAtMs))} - ${formatter.format(new Date(endsAtMs))}`;
  }

  const timestamp = startsAtMs ?? endsAtMs;
  if (!timestamp) {
    return undefined;
  }

  return formatter.format(new Date(timestamp));
}

export function mapMetroAlert(rawAlert: MetroAlertRaw): ServiceAlertDto | null {
  const publication = rawAlert.publications?.[0];
  const title = cleanMetroAlertTitle(pickLocalizedText(publication, 'header'));
  const description = pickLocalizedText(publication, 'text');
  const alertId = rawAlert.id;

  if (!alertId || (!title && !description)) {
    return null;
  }

  const firstDate = rawAlert.disruption_dates?.[0];
  const startsAtMs = firstDate?.begin_date ?? publication?.begin_date;
  const endsAtMs = firstDate?.end_date ?? publication?.end_date;
  const affectedLines = dedupeLines(
    (rawAlert.entities ?? [])
      .map((entity) => normalizeMetroLineCode(entity.line_code, entity.line_name))
      .filter((code): code is string => Boolean(code))
      .map((code) => ({ mode: 'metro', code })),
  );
  const textForSeverity = `${title} ${description}`;

  return {
    id: `tmb-alerts-api:metro:${alertId}`,
    title: title || 'Alerta de metro',
    description,
    mode: 'metro',
    severity: mapStatusToSeverity(
      rawAlert.categories?.effect_status ?? rawAlert.effect?.status,
      textForSeverity,
    ),
    kind: 'current',
    affectedLines,
    source: 'tmb-alerts-api',
    dateLabel: dateLabel(startsAtMs, endsAtMs),
    startsAtMs,
    endsAtMs,
    updatedAtMs: rawAlert.tstamp,
  };
}

export function mapBusAlert(rawAlert: BusAlertRaw): ServiceAlertDto | null {
  const alertId = rawAlert.id;
  const title = cleanText(rawAlert.typeName ?? rawAlert.causeName ?? '');
  const description = cleanText(rawAlert.channelInfoTO?.textCa ?? rawAlert.channelInfoTO?.textEs ?? rawAlert.channelInfoTO?.textEn);

  if (!alertId || (!title && !description)) {
    return null;
  }

  const startsAtMs = rawAlert.begin ?? rawAlert.channelInfoTO?.begin;
  const endsAtMs = rawAlert.end ?? rawAlert.channelInfoTO?.end;
  const affectedLines = dedupeLines(
    (rawAlert.linesAffected ?? [])
      // Only `commercialLineId` is the public code (e.g. "H12"); `lineId` is an
      // internal id ("212" for H12), so we never fall back to it as a display code.
      .map((line) => line.commercialLineId)
      .filter((code): code is string | number => code !== undefined)
      .map((code) => ({ mode: 'bus', code: String(code).trim().toUpperCase() })),
  );
  const textForSeverity = `${title} ${description}`;

  return {
    id: `tmb-alerts-api:bus:${alertId}`,
    title: title || 'Alerta de bus',
    description,
    mode: 'bus',
    severity: mapStatusToSeverity(rawAlert.categories?.messageType, textForSeverity),
    kind: 'current',
    affectedLines,
    source: 'tmb-alerts-api',
    dateLabel: dateLabel(startsAtMs, endsAtMs),
    startsAtMs,
    endsAtMs,
    updatedAtMs: rawAlert.modified ?? rawAlert.channelInfoTO?.modified,
  };
}

async function fetchRawAlerts<TAlert>(mode: TransportMode): Promise<TAlert[]> {
  const response = await fetchWithTimeout(buildAlertsUrl(mode), {
    headers: {
      accept: 'application/json',
      'user-agent': 'tmb-transit/1.0 service-alerts',
    },
  });

  if (!response.ok) {
    throw new Error(`TMB alerts API failed with status ${response.status} for ${mode}`);
  }

  const payload = (await response.json()) as TmbAlertsEnvelope<TAlert>;
  if (payload.status !== 'success') {
    throw new Error(`TMB alerts API returned an invalid status for ${mode}`);
  }

  return payload.data?.alerts ?? [];
}

export async function fetchOperationalServiceAlertsFromTmb(): Promise<ServiceAlertDto[]> {
  const [metroAlerts, busAlerts] = await Promise.all([
    fetchRawAlerts<MetroAlertRaw>('metro'),
    fetchRawAlerts<BusAlertRaw>('bus'),
  ]);

  return [
    ...metroAlerts.map(mapMetroAlert),
    ...busAlerts.map(mapBusAlert),
  ].filter((alert): alert is ServiceAlertDto => alert !== null);
}
