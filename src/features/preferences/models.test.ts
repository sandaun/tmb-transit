import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addRecentItem,
  getAppLanguageFromLocale,
  MAX_RECENT_ITEMS,
  normalizePreferences,
  type RecentItem,
} from '@/src/features/preferences/models';

test('normalizes malformed stored preferences to safe defaults', () => {
  const preferences = normalizePreferences({
    language: 'fr',
    favoriteLines: 'invalid',
    favoriteStops: [],
    recentItems: Array.from({ length: 12 }, (_, index) => ({
      kind: 'station', mode: 'metro', lineCode: 'L1', stationCode: String(index), stationName: 'Test', visitedAtMs: index,
    })),
    savedPlaces: { home: { id: 'home', label: 'Invalid', lat: 'no', lon: 2, updatedAtMs: 1 } },
  });

  assert.equal(preferences.version, 3);
  assert.equal(preferences.language, null);
  assert.equal(preferences.theme, 'system');
  assert.deepEqual(preferences.favoriteLines, []);
  assert.equal(preferences.recentItems.length, MAX_RECENT_ITEMS);
  assert.deepEqual(preferences.savedPlaces, {});
});

test('migrates the legacy mine alert filter to an independent preference', () => {
  const preferences = normalizePreferences({ alertsFilter: 'mine' });

  assert.equal(preferences.alertsTimeFilter, 'all');
  assert.equal(preferences.alertsMineOnly, true);
});

test('migrates legacy time filters and preserves the new alert preferences', () => {
  assert.deepEqual(
    {
      time: normalizePreferences({ alertsFilter: 'planned' }).alertsTimeFilter,
      mineOnly: normalizePreferences({ alertsFilter: 'planned' }).alertsMineOnly,
    },
    { time: 'planned', mineOnly: false },
  );
  assert.deepEqual(
    {
      time: normalizePreferences({ alertsTimeFilter: 'current', alertsMineOnly: true }).alertsTimeFilter,
      mineOnly: normalizePreferences({ alertsTimeFilter: 'current', alertsMineOnly: true }).alertsMineOnly,
    },
    { time: 'current', mineOnly: true },
  );
});

test('preserves supported theme preferences', () => {
  assert.equal(normalizePreferences({ theme: 'light' }).theme, 'light');
  assert.equal(normalizePreferences({ theme: 'dark' }).theme, 'dark');
  assert.equal(normalizePreferences({ theme: 'contrast' }).theme, 'system');
});

test('preserves rail favorites during preference normalization', () => {
  const preferences = normalizePreferences({
    favoriteLines: [
      { mode: 'fgc', lineCode: 'S1', addedAtMs: 1 },
      { mode: 'tram', lineCode: 'T3', addedAtMs: 2 },
    ],
    favoriteStops: [{
      mode: 'tram',
      lineCode: 'T3',
      stationCode: 'FM',
      stationName: 'Francesc Macià',
      addedAtMs: 3,
    }],
  });

  assert.deepEqual(preferences.favoriteLines, [
    { mode: 'fgc', lineCode: 'S1', addedAtMs: 1 },
    { mode: 'tram', lineCode: 'T3', addedAtMs: 2 },
  ]);
  assert.deepEqual(preferences.favoriteStops, [
    {
      mode: 'tram',
      lineCode: 'T3',
      stationCode: 'FM',
      stationName: 'Francesc Macià',
      addedAtMs: 3,
    },
  ]);
});

test('uses supported device languages and falls back to Catalan', () => {
  assert.equal(getAppLanguageFromLocale('en-GB'), 'en');
  assert.equal(getAppLanguageFromLocale('es-ES'), 'es');
  assert.equal(getAppLanguageFromLocale('ca-ES'), 'ca');
  assert.equal(getAppLanguageFromLocale('fr-FR'), 'ca');
});

test('deduplicates recent entries and retains only the latest ten', () => {
  const recentItems: RecentItem[] = Array.from({ length: 10 }, (_, index) => ({
    kind: 'station',
    mode: 'metro',
    lineCode: 'L1',
    stationCode: String(index),
    stationName: `Station ${index}`,
    visitedAtMs: index,
  }));
  const repeated = { ...recentItems[5], visitedAtMs: 99 };
  const deduplicated = addRecentItem(recentItems, repeated);
  const result = addRecentItem(deduplicated, {
    kind: 'station',
    mode: 'metro',
    lineCode: 'L1',
    stationCode: 'new',
    stationName: 'New station',
    visitedAtMs: 100,
  });

  assert.equal(result.length, MAX_RECENT_ITEMS);
  assert.equal(deduplicated.filter((item) => item.kind === 'station' && item.stationCode === '5').length, 1);
  assert.equal(result[0].kind === 'station' && result[0].stationCode, 'new');
  assert.equal(result.some((item) => item.kind === 'station' && item.stationCode === '9'), false);
});
