import { create } from 'zustand';

import {
  createDefaultPreferences,
  addRecentItem,
  getDeviceLanguage,
  lineKey,
  stopKey,
  type AppLanguage,
  type AlertsTimeFilter,
  type FavoriteLine,
  type FavoriteStop,
  type MapSelection,
  type RecentItem,
  type SavedPlace,
  type SavedPlaceId,
  type ThemePreference,
  type UserPreferences,
} from '@/src/features/preferences/models';
import { readUserPreferences, writeUserPreferences } from '@/src/features/preferences/storage';

interface UserPreferencesStore extends UserPreferences {
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setLanguage: (language: AppLanguage) => void;
  setTheme: (theme: ThemePreference) => void;
  setAlertsTimeFilter: (filter: AlertsTimeFilter) => void;
  setAlertsMineOnly: (mineOnly: boolean) => void;
  setSavedPlace: (place: SavedPlace) => void;
  removeSavedPlace: (id: SavedPlaceId) => void;
  toggleFavoriteLine: (line: Omit<FavoriteLine, 'addedAtMs'>) => void;
  toggleFavoriteStop: (stop: Omit<FavoriteStop, 'addedAtMs'>) => void;
  addRecentItem: (item: RecentItem) => void;
  setLastMapSelection: (selection: MapSelection) => void;
  clearSavedData: () => void;
}

function preferencesFromState(state: UserPreferencesStore): UserPreferences {
  return {
    version: 3,
    language: state.language,
    theme: state.theme,
    alertsTimeFilter: state.alertsTimeFilter,
    alertsMineOnly: state.alertsMineOnly,
    savedPlaces: state.savedPlaces,
    favoriteLines: state.favoriteLines,
    favoriteStops: state.favoriteStops,
    recentItems: state.recentItems,
    lastMapSelection: state.lastMapSelection,
  };
}

function persist(get: () => UserPreferencesStore): void {
  void writeUserPreferences(preferencesFromState(get()));
}

export const useUserPreferencesStore = create<UserPreferencesStore>((set, get) => ({
  ...createDefaultPreferences(),
  isHydrated: false,
  hydrate: async () => {
    if (get().isHydrated) return;
    const preferences = await readUserPreferences();
    set({
      ...preferences,
      language: preferences.language ?? getDeviceLanguage(),
      isHydrated: true,
    });
    persist(get);
  },
  setLanguage: (language) => {
    set({ language });
    persist(get);
  },
  setTheme: (theme) => {
    set({ theme });
    persist(get);
  },
  setAlertsTimeFilter: (alertsTimeFilter) => {
    set({ alertsTimeFilter });
    persist(get);
  },
  setAlertsMineOnly: (alertsMineOnly) => {
    set({ alertsMineOnly });
    persist(get);
  },
  setSavedPlace: (place) => {
    set((state) => ({ savedPlaces: { ...state.savedPlaces, [place.id]: place } }));
    persist(get);
  },
  removeSavedPlace: (id) => {
    set((state) => {
      const { [id]: _, ...savedPlaces } = state.savedPlaces;
      return { savedPlaces };
    });
    persist(get);
  },
  toggleFavoriteLine: (line) => {
    const key = lineKey(line.mode, line.lineCode);
    set((state) => {
      const exists = state.favoriteLines.some((item) => lineKey(item.mode, item.lineCode) === key);
      return {
        favoriteLines: exists
          ? state.favoriteLines.filter((item) => lineKey(item.mode, item.lineCode) !== key)
          : [{ ...line, addedAtMs: Date.now() }, ...state.favoriteLines],
      };
    });
    persist(get);
  },
  toggleFavoriteStop: (stop) => {
    const key = stopKey(stop.mode, stop.lineCode, stop.stationCode);
    set((state) => {
      const exists = state.favoriteStops.some(
        (item) => stopKey(item.mode, item.lineCode, item.stationCode) === key,
      );
      return {
        favoriteStops: exists
          ? state.favoriteStops.filter(
              (item) => stopKey(item.mode, item.lineCode, item.stationCode) !== key,
            )
          : [{ ...stop, addedAtMs: Date.now() }, ...state.favoriteStops],
      };
    });
    persist(get);
  },
  addRecentItem: (item) => {
    set((state) => ({ recentItems: addRecentItem(state.recentItems, item) }));
    persist(get);
  },
  setLastMapSelection: (selection) => {
    set({ lastMapSelection: selection });
    persist(get);
  },
  clearSavedData: () => {
    set(() => ({
      favoriteLines: [],
      favoriteStops: [],
      recentItems: [],
    }));
    persist(get);
  },
}));
