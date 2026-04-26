export interface MetroLineBrand {
  backgroundColor: string;
  label: string;
  textColor: string;
}

const TMB_METRO_LINE_BRANDS: Record<string, MetroLineBrand> = {
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

export function getMetroLineBrand(
  lineCode: string,
  color?: string,
): MetroLineBrand {
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
    backgroundColor: apiColor ?? '#24304A',
    textColor: '#FFFFFF',
  };
}
