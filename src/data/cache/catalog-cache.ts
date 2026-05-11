import AsyncStorage from '@react-native-async-storage/async-storage';

import { APP_CONFIG } from '@/src/config/app-config';

interface CachedPayload<T> {
  createdAt: number;
  data: T;
}

const cacheNamespace = APP_CONFIG.useMock ? 'mock' : `api:${APP_CONFIG.apiBaseUrl}`;

function keyFor(baseKey: string): string {
  return `tmb:catalog:v4:${cacheNamespace}:${baseKey}`;
}

export async function readCatalogCache<T>(baseKey: string): Promise<CachedPayload<T> | null> {
  const raw = await AsyncStorage.getItem(keyFor(baseKey));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CachedPayload<T>;
    if (!parsed || typeof parsed.createdAt !== 'number') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function writeCatalogCache<T>(baseKey: string, data: T): Promise<void> {
  const payload: CachedPayload<T> = {
    createdAt: Date.now(),
    data,
  };

  await AsyncStorage.setItem(keyFor(baseKey), JSON.stringify(payload));
}
