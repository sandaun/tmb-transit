import { useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import type { AppColorScheme } from '@/constants/colors';
import { useUserPreferencesStore } from '@/src/features/preferences/store';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme(): AppColorScheme {
  const [hasHydrated, setHasHydrated] = useState(false);
  const systemColorScheme = useSystemColorScheme();
  const theme = useUserPreferencesStore((state) => state.theme);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (theme === 'light' || theme === 'dark') return theme;
  if (!hasHydrated) return 'light';
  return systemColorScheme === 'dark' ? 'dark' : 'light';
}
