import { useColorScheme as useSystemColorScheme } from 'react-native';

import type { AppColorScheme } from '@/constants/colors';
import { useUserPreferencesStore } from '@/src/features/preferences/store';

export function useColorScheme(): AppColorScheme {
  const systemColorScheme = useSystemColorScheme();
  const theme = useUserPreferencesStore((state) => state.theme);

  if (theme === 'light' || theme === 'dark') return theme;
  return systemColorScheme === 'dark' ? 'dark' : 'light';
}
