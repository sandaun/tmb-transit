import type { Line } from '@/src/domain/catalog/models';

export type BusLineFamily = 'H' | 'V' | 'D' | 'X' | 'N' | 'M' | 'num';

export interface BusFamilyDescriptor {
  id: BusLineFamily;
  label: string;
  description: string;
}

export const BUS_FAMILIES: BusFamilyDescriptor[] = [
  { id: 'H', label: 'H', description: 'Horitzontals' },
  { id: 'V', label: 'V', description: 'Verticals' },
  { id: 'D', label: 'D', description: 'Diagonals' },
  { id: 'X', label: 'X', description: 'Exprés' },
  { id: 'N', label: 'N', description: 'Nit' },
  { id: 'M', label: 'M', description: 'Metropolitans' },
  { id: 'num', label: '1-9', description: 'Convencionals' },
];

export function getBusLineFamily(code: string): BusLineFamily {
  const normalized = code.trim().toUpperCase();
  const prefix = normalized.charAt(0);

  if (prefix === 'H' || prefix === 'V' || prefix === 'D' || prefix === 'X' || prefix === 'N' || prefix === 'M') {
    return prefix;
  }

  return 'num';
}

export function listAvailableFamilies(lines: Line[]): BusLineFamily[] {
  const present = new Set<BusLineFamily>();
  for (const line of lines) {
    if (line.mode !== 'bus') {
      continue;
    }
    present.add(getBusLineFamily(line.code));
  }

  return BUS_FAMILIES.filter((family) => present.has(family.id)).map((family) => family.id);
}

export function filterLinesByFamily(lines: Line[], family: BusLineFamily | null): Line[] {
  if (!family) {
    return lines;
  }

  return lines.filter((line) => line.mode === 'bus' && getBusLineFamily(line.code) === family);
}
