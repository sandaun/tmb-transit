import AsyncStorage from '@react-native-async-storage/async-storage';

interface CachedPayload<T> {
  createdAt: number;
  data: T;
}

function keyFor(baseKey: string): string {
  return `tmb:catalog:${baseKey}`;
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
