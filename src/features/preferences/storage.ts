import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createDefaultPreferences,
  normalizePreferences,
  type UserPreferences,
} from '@/src/features/preferences/models';

const STORAGE_KEY = 'tmb:user-preferences:v1';

export async function readUserPreferences(): Promise<UserPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? normalizePreferences(JSON.parse(raw) as unknown) : createDefaultPreferences();
  } catch {
    return createDefaultPreferences();
  }
}

export async function writeUserPreferences(preferences: UserPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Preferences are an enhancement and must never block transit data.
  }
}
