import { useMemo } from 'react';

import { getPalette, type Palette } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function usePalette(): Palette {
  return getPalette(useColorScheme());
}

export function useThemedStyles<T>(factory: (palette: Palette) => T): T {
  const palette = usePalette();
  return useMemo(() => factory(palette), [factory, palette]);
}
