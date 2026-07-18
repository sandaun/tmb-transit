import type { TransportMode } from '@/src/domain/catalog/models';

export interface LineBrand {
  backgroundColor: string;
  label: string;
  textColor: string;
}

const TMB_METRO_LINE_BRANDS: Record<string, LineBrand> = {
  L1: { label: 'L1', backgroundColor: '#CE1126', textColor: '#FFFFFF' },
  L2: { label: 'L2', backgroundColor: '#93248F', textColor: '#FFFFFF' },
  L3: { label: 'L3', backgroundColor: '#1EB53A', textColor: '#FFFFFF' },
  L4: { label: 'L4', backgroundColor: '#F7A30E', textColor: '#111827' },
  L5: { label: 'L5', backgroundColor: '#005A97', textColor: '#FFFFFF' },
  L9N: { label: 'L9N', backgroundColor: '#FB712B', textColor: '#FFFFFF' },
  L9S: { label: 'L9S', backgroundColor: '#FB712B', textColor: '#FFFFFF' },
  L10N: { label: 'L10N', backgroundColor: '#00A6D6', textColor: '#111827' },
  L10S: { label: 'L10S', backgroundColor: '#00A6D6', textColor: '#111827' },
  L11: { label: 'L11', backgroundColor: '#89B94C', textColor: '#111827' },
  FM: { label: 'FM', backgroundColor: '#004C38', textColor: '#FFFFFF' },
};

const numericMetroLineKeys: Record<string, string> = {
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

const BUS_FALLBACK_BACKGROUND = '#1F4FB6';
const METRO_FALLBACK_BACKGROUND = '#24304A';
const FGC_FALLBACK_BACKGROUND = '#5E2D83';
const TRAM_FALLBACK_BACKGROUND = '#E30613';
const BUS_FAMILY_BACKGROUNDS: Record<string, string> = {
  H: '#009DDC',
  V: '#4DAF50',
  D: '#8A4FA3',
};

function normalizeMetroLineKey(lineCode: string): string {
  const normalized = lineCode.trim().toUpperCase().replace(/\s+/g, '');

  return numericMetroLineKeys[normalized] ?? normalized;
}

function toHexColor(color: string | undefined): string | null {
  if (!color) {
    return null;
  }

  const normalized = color.trim().replace(/^#/, '');
  return /^[0-9A-Fa-f]{6}$/.test(normalized) ? `#${normalized.toUpperCase()}` : null;
}

function getMetroBrand(lineCode: string, color?: string): LineBrand {
  const key = normalizeMetroLineKey(lineCode);
  const brand = TMB_METRO_LINE_BRANDS[key];
  const apiColor = toHexColor(color);

  if (brand && apiColor) {
    return { ...brand, backgroundColor: apiColor };
  }

  if (brand) {
    return brand;
  }

  return {
    label: key || lineCode,
    backgroundColor: apiColor ?? METRO_FALLBACK_BACKGROUND,
    textColor: '#FFFFFF',
  };
}

function getBusBrand(lineCode: string, color?: string): LineBrand {
  const apiColor = toHexColor(color);
  const normalized = lineCode.trim().toUpperCase();
  const familyColor = BUS_FAMILY_BACKGROUNDS[normalized.charAt(0)];
  const conventionalColor = /^\d/.test(normalized) ? '#E2231A' : null;
  return {
    label: normalized || lineCode,
    backgroundColor: apiColor ?? familyColor ?? conventionalColor ?? BUS_FALLBACK_BACKGROUND,
    textColor: '#FFFFFF',
  };
}

function getFgcBrand(lineCode: string, color?: string): LineBrand {
  const backgroundColor = toHexColor(color) ?? FGC_FALLBACK_BACKGROUND;
  const hex = backgroundColor.slice(1);
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1_000;
  return {
    label: lineCode.trim().toUpperCase() || lineCode,
    backgroundColor,
    textColor: luminance > 170 ? '#111827' : '#FFFFFF',
  };
}

function getTramBrand(lineCode: string, color?: string): LineBrand {
  const backgroundColor = toHexColor(color) ?? TRAM_FALLBACK_BACKGROUND;
  const hex = backgroundColor.slice(1);
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1_000;
  return {
    label: lineCode.trim().toUpperCase() || lineCode,
    backgroundColor,
    textColor: luminance > 170 ? '#111827' : '#FFFFFF',
  };
}

export function getLineBrand(
  mode: TransportMode,
  lineCode: string,
  color?: string,
): LineBrand {
  if (mode === 'bus') return getBusBrand(lineCode, color);
  if (mode === 'fgc') return getFgcBrand(lineCode, color);
  if (mode === 'tram') return getTramBrand(lineCode, color);
  return getMetroBrand(lineCode, color);
}
