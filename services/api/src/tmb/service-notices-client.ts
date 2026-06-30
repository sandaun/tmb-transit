import type {
  ServiceAlertDto,
  ServiceAlertLineDto,
  ServiceAlertMode,
  ServiceAlertSeverity,
  TransportMode,
} from '../types/api';

const TMB_SERVICE_NOTICES_URL = 'https://www.tmb.cat/es/transporte-barcelona/avisos-servicio';

const NOTICE_ITEM_PATTERNS = [
  /<li\b(?<attrs>[^>]*class="[^"]*\bevents-v2__item\b[^"]*"[^>]*)>(?<body>[\s\S]*?)<\/li>/gi,
  /<li\b(?<attrs>[^>]*class="[^"]*\blist__item\b[^"]*"[^>]*)>(?<body>[\s\S]*?)<\/li>/gi,
] as const;

const TITLE_PATTERNS = [
  /<h2\b[^>]*class="[^"]*\bevents-v2__card-title\b[^"]*"[^>]*>([\s\S]*?)<\/h2>/i,
  /<h2\b[^>]*class="[^"]*\bevent-unit__title\b[^"]*"[^>]*>([\s\S]*?)<\/h2>/i,
] as const;

const DESCRIPTION_PATTERNS = [
  /<p\b[^>]*class="[^"]*\bevents-v2__card-description\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i,
  /<p\b[^>]*class="[^"]*\bevent-unit__description\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i,
] as const;

const DATE_PATTERNS = [
  /<div\b[^>]*class="[^"]*\bevents-v2__card-date\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  /<p\b[^>]*class="[^"]*\bevent-unit__date\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i,
] as const;

const NAMED_ENTITIES: Record<string, string> = {
  aacute: 'á',
  agrave: 'à',
  amp: '&',
  apos: "'",
  ccedil: 'ç',
  eacute: 'é',
  egrave: 'è',
  gt: '>',
  iacute: 'í',
  igrave: 'ì',
  lt: '<',
  ntilde: 'ñ',
  nbsp: ' ',
  oacute: 'ó',
  ograve: 'ò',
  quot: '"',
  uacute: 'ú',
  ugrave: 'ù',
  uuml: 'ü',
};

interface NoticeItem {
  attrs: string;
  body: string;
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    const lowerCode = code.toLowerCase();

    if (lowerCode.startsWith('#x')) {
      return String.fromCodePoint(Number.parseInt(lowerCode.slice(2), 16));
    }

    if (lowerCode.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(lowerCode.slice(1), 10));
    }

    return NAMED_ENTITIES[lowerCode] ?? match;
  });
}

function cleanText(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' '),
  ).trim();
}

function readAttr(attrs: string, name: string): string | null {
  const match = attrs.match(new RegExp(`\\b${name}="([^"]*)"`, 'i'));
  return match ? decodeHtmlEntities(match[1]).trim() : null;
}

function extractFirstText(body: string, patterns: readonly RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = body.match(pattern);
    const value = match?.[1];
    if (value) {
      const text = cleanText(value);
      if (text) {
        return text;
      }
    }
  }

  return null;
}

function extractHref(body: string, pageUrl: string): string | undefined {
  const href = body.match(/<a\b[^>]*href="([^"]+)"/i)?.[1];
  if (!href) {
    return undefined;
  }

  return new URL(decodeHtmlEntities(href), pageUrl).toString();
}

function parseEpochAttr(attrs: string, name: string): number | undefined {
  const rawValue = readAttr(attrs, name);
  if (!rawValue) {
    return undefined;
  }

  const value = Number(rawValue.trim());
  return Number.isFinite(value) ? value : undefined;
}

function normalizeLineCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

function isMetroLineCode(code: string): boolean {
  return /^(?:L\d{1,2}[NS]?|FM)$/.test(code);
}

function isBusLineCode(code: string): boolean {
  return /^(?:[HDVX]\d{1,2}|N\d{1,2}|\d{1,3})$/.test(code);
}

function inferLineMode(code: string): TransportMode | null {
  if (isMetroLineCode(code)) {
    return 'metro';
  }

  if (isBusLineCode(code)) {
    return 'bus';
  }

  return null;
}

function parseAffectedLines(attrs: string): ServiceAlertLineDto[] {
  const titleAttr = readAttr(attrs, 'data-title');
  if (!titleAttr) {
    return [];
  }

  const seen = new Set<string>();
  const lines: ServiceAlertLineDto[] = [];

  for (const rawToken of titleAttr.split(',')) {
    const code = normalizeLineCode(rawToken);
    const mode = inferLineMode(code);
    const key = mode ? `${mode}:${code}` : null;

    if (!mode || !key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    lines.push({ mode, code });
  }

  return lines;
}

function inferMode(
  affectedLines: ServiceAlertLineDto[],
  type: string | null,
  text: string,
): ServiceAlertMode {
  const lineModes = new Set(affectedLines.map((line) => line.mode));

  if (lineModes.size > 1) {
    return 'mixed';
  }

  const [lineMode] = [...lineModes];
  if (lineMode) {
    return lineMode;
  }

  const normalizedType = type?.toLowerCase();
  const normalizedText = text.toLowerCase();

  if (normalizedType === 't-5' || /\b(bus|autob[uú]s)\b/.test(normalizedText)) {
    return 'bus';
  }

  if (normalizedType === 't-6' || normalizedType === 't-9' || /\b(metro|l\d{1,2})\b/.test(normalizedText)) {
    return 'metro';
  }

  return 'mixed';
}

function inferSeverity(text: string): ServiceAlertSeverity {
  const normalized = text.toLowerCase();

  if (
    /sin servicio|sense servei|fuera de servicio|fora de servei|corte|interrump|cerrad|tancat|tall|no funcionar/.test(
      normalized,
    )
  ) {
    return 'disruption';
  }

  if (/afectaci|alteraci|modific|desvi|limitaci|obras|obres|manten/.test(normalized)) {
    return 'warning';
  }

  return 'info';
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function buildAlertId(title: string, sourceUrl: string | undefined, startsAtMs: number | undefined): string {
  if (sourceUrl) {
    const pathname = new URL(sourceUrl).pathname;
    const slug = pathname.split('/').filter(Boolean).at(-1);
    if (slug) {
      return `tmb:${slug}`;
    }
  }

  return `tmb:${slugify(title)}:${startsAtMs ?? 'unknown'}`;
}

function collectNoticeItems(html: string): NoticeItem[] {
  const items: NoticeItem[] = [];

  for (const pattern of NOTICE_ITEM_PATTERNS) {
    for (const match of html.matchAll(pattern)) {
      const attrs = match.groups?.attrs;
      const body = match.groups?.body;

      if (attrs && body) {
        items.push({ attrs, body });
      }
    }
  }

  return items;
}

function parseNoticeItem(item: NoticeItem, pageUrl: string): ServiceAlertDto | null {
  const title = extractFirstText(item.body, TITLE_PATTERNS);
  if (!title) {
    return null;
  }

  const description = extractFirstText(item.body, DESCRIPTION_PATTERNS) ?? '';
  const dateLabel = extractFirstText(item.body, DATE_PATTERNS) ?? undefined;
  const startsAtMs = parseEpochAttr(item.attrs, 'data-start');
  const endsAtMs = parseEpochAttr(item.attrs, 'data-end');
  const affectedLines = parseAffectedLines(item.attrs);
  const sourceUrl = extractHref(item.body, pageUrl);
  const textForClassification = `${title} ${description}`;
  const mode = inferMode(affectedLines, readAttr(item.attrs, 'data-type'), textForClassification);

  return {
    id: buildAlertId(title, sourceUrl, startsAtMs),
    title,
    description,
    mode,
    severity: inferSeverity(textForClassification),
    affectedLines,
    source: 'tmb-service-notices',
    sourceUrl,
    dateLabel,
    startsAtMs,
    endsAtMs,
  };
}

export function parseServiceNoticesHtml(
  html: string,
  pageUrl = TMB_SERVICE_NOTICES_URL,
): ServiceAlertDto[] {
  const alerts = collectNoticeItems(html)
    .map((item) => parseNoticeItem(item, pageUrl))
    .filter((alert): alert is ServiceAlertDto => alert !== null);
  const dedupedAlerts = new Map<string, ServiceAlertDto>();

  for (const alert of alerts) {
    if (!dedupedAlerts.has(alert.id)) {
      dedupedAlerts.set(alert.id, alert);
    }
  }

  return [...dedupedAlerts.values()];
}

export async function fetchServiceAlertsFromTmb(): Promise<ServiceAlertDto[]> {
  const response = await fetch(TMB_SERVICE_NOTICES_URL, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'user-agent': 'tmb-transit/1.0 service-alerts',
    },
  });

  if (!response.ok) {
    throw new Error(`TMB service notices request failed: ${response.status}`);
  }

  return parseServiceNoticesHtml(await response.text(), TMB_SERVICE_NOTICES_URL);
}
