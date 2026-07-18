import type { TransportMode } from '@/src/domain/catalog/models';

export type AppLanguage = 'ca' | 'en' | 'es';
export type ThemePreference = 'system' | 'light' | 'dark';
export type SavedPlaceId = 'home' | 'work';
export type AlertsTimeFilter = 'all' | 'current' | 'planned';

export interface SavedPlace {
  id: SavedPlaceId;
  label: string;
  lat: number;
  lon: number;
  updatedAtMs: number;
}

export interface FavoriteLine {
  mode: TransportMode;
  lineCode: string;
  addedAtMs: number;
}

export interface FavoriteStop {
  mode: TransportMode;
  lineCode: string;
  stationCode: string;
  stationName: string;
  addedAtMs: number;
}

export interface RecentStation {
  kind: 'station';
  mode: TransportMode;
  lineCode: string;
  stationCode: string;
  stationName: string;
  visitedAtMs: number;
}

export interface RecentRoute {
  kind: 'route';
  origin: { lat: number; lon: number; label: string };
  destination: { lat: number; lon: number; label: string };
  visitedAtMs: number;
}

export type RecentItem = RecentStation | RecentRoute;

export interface MapSelection {
  mode: TransportMode;
  lineCode: string;
  stationCode: string;
}

export interface UserPreferences {
  version: 3;
  language: AppLanguage | null;
  theme: ThemePreference;
  alertsTimeFilter: AlertsTimeFilter;
  alertsMineOnly: boolean;
  savedPlaces: Partial<Record<SavedPlaceId, SavedPlace>>;
  favoriteLines: FavoriteLine[];
  favoriteStops: FavoriteStop[];
  recentItems: RecentItem[];
  lastMapSelection: MapSelection | null;
}

export const MAX_RECENT_ITEMS = 10;

export function lineKey(mode: TransportMode, lineCode: string): string {
  return `${mode}:${lineCode}`;
}

export function stopKey(mode: TransportMode, lineCode: string, stationCode: string): string {
  return `${mode}:${lineCode}:${stationCode}`;
}

export function getAppLanguageFromLocale(locale: string): AppLanguage {
  const normalized = locale.toLowerCase();

  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('es')) return 'es';
  return 'ca';
}

export function getDeviceLanguage(): AppLanguage {
  return getAppLanguageFromLocale(Intl.DateTimeFormat().resolvedOptions().locale);
}

export function createDefaultPreferences(): UserPreferences {
  return {
    version: 3,
    language: null,
    theme: 'system',
    alertsTimeFilter: 'all',
    alertsMineOnly: false,
    savedPlaces: {},
    favoriteLines: [],
    favoriteStops: [],
    recentItems: [],
    lastMapSelection: null,
  };
}

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'ca' || value === 'en' || value === 'es';
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function isAlertsTimeFilter(value: unknown): value is AlertsTimeFilter {
  return value === 'all' || value === 'current' || value === 'planned';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isTransportMode(value: unknown): value is TransportMode {
  return value === 'metro' || value === 'bus' || value === 'fgc' || value === 'tram';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isSavedPlace(value: unknown, id: SavedPlaceId): value is SavedPlace {
  return isRecord(value) &&
    value.id === id &&
    typeof value.label === 'string' &&
    isFiniteNumber(value.lat) &&
    isFiniteNumber(value.lon) &&
    isFiniteNumber(value.updatedAtMs);
}

function isFavoriteLine(value: unknown): value is FavoriteLine {
  return isRecord(value) &&
    isTransportMode(value.mode) &&
    typeof value.lineCode === 'string' &&
    isFiniteNumber(value.addedAtMs);
}

function isFavoriteStop(value: unknown): value is FavoriteStop {
  return isRecord(value) &&
    isTransportMode(value.mode) &&
    typeof value.lineCode === 'string' &&
    typeof value.stationCode === 'string' &&
    typeof value.stationName === 'string' &&
    isFiniteNumber(value.addedAtMs);
}

function isRecentItem(value: unknown): value is RecentItem {
  if (!isRecord(value) || !isFiniteNumber(value.visitedAtMs)) return false;
  if (value.kind === 'station') {
    return isTransportMode(value.mode) &&
      typeof value.lineCode === 'string' &&
      typeof value.stationCode === 'string' &&
      typeof value.stationName === 'string';
  }
  if (value.kind !== 'route' || !isRecord(value.origin) || !isRecord(value.destination)) return false;
  return isFiniteNumber(value.origin.lat) &&
    isFiniteNumber(value.origin.lon) &&
    typeof value.origin.label === 'string' &&
    isFiniteNumber(value.destination.lat) &&
    isFiniteNumber(value.destination.lon) &&
    typeof value.destination.label === 'string';
}

function isMapSelection(value: unknown): value is MapSelection {
  return isRecord(value) &&
    isTransportMode(value.mode) &&
    typeof value.lineCode === 'string' &&
    typeof value.stationCode === 'string';
}

export function normalizePreferences(value: unknown): UserPreferences {
  const defaults = createDefaultPreferences();
  if (!value || typeof value !== 'object') return defaults;

  const candidate = value as Record<string, unknown>;
  const legacyAlertsFilter = candidate.alertsFilter;
  const savedPlaces: Partial<Record<SavedPlaceId, SavedPlace>> = {};
  if (isRecord(candidate.savedPlaces)) {
    if (isSavedPlace(candidate.savedPlaces.home, 'home')) savedPlaces.home = candidate.savedPlaces.home;
    if (isSavedPlace(candidate.savedPlaces.work, 'work')) savedPlaces.work = candidate.savedPlaces.work;
  }

  return {
    ...defaults,
    language: isAppLanguage(candidate.language) ? candidate.language : null,
    theme: isThemePreference(candidate.theme) ? candidate.theme : 'system',
    alertsTimeFilter: isAlertsTimeFilter(candidate.alertsTimeFilter)
      ? candidate.alertsTimeFilter
      : isAlertsTimeFilter(legacyAlertsFilter)
        ? legacyAlertsFilter
        : 'all',
    alertsMineOnly: typeof candidate.alertsMineOnly === 'boolean'
      ? candidate.alertsMineOnly
      : legacyAlertsFilter === 'mine',
    savedPlaces,
    favoriteLines: Array.isArray(candidate.favoriteLines)
      ? candidate.favoriteLines.filter(isFavoriteLine)
      : [],
    favoriteStops: Array.isArray(candidate.favoriteStops)
      ? candidate.favoriteStops.filter(isFavoriteStop)
      : [],
    recentItems: Array.isArray(candidate.recentItems)
      ? candidate.recentItems.filter(isRecentItem).slice(0, MAX_RECENT_ITEMS)
      : [],
    lastMapSelection: isMapSelection(candidate.lastMapSelection) ? candidate.lastMapSelection : null,
  };
}

function recentItemKey(item: RecentItem): string {
  if (item.kind === 'station') {
    return `station:${stopKey(item.mode, item.lineCode, item.stationCode)}`;
  }

  return `route:${item.origin.lat}:${item.origin.lon}:${item.destination.lat}:${item.destination.lon}`;
}

export function addRecentItem(items: RecentItem[], item: RecentItem): RecentItem[] {
  const key = recentItemKey(item);
  return [item, ...items.filter((candidate) => recentItemKey(candidate) !== key)].slice(
    0,
    MAX_RECENT_ITEMS,
  );
}
