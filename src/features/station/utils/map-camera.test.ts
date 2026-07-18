import assert from 'node:assert/strict';
import test from 'node:test';

import { getViewportFocusedRegion } from './map-camera';

const currentRegion = {
  latitude: 41.39,
  longitude: 2.17,
  latitudeDelta: 0.08,
  longitudeDelta: 0.06,
};

test('keeps the station at the map center when the viewport is unobstructed', () => {
  const region = getViewportFocusedRegion(
    { latitude: 41.4, longitude: 2.18 },
    currentRegion,
    { height: 800, topInset: 0, bottomInset: 0 },
  );

  assert.equal(region.latitude, 41.4);
  assert.equal(region.longitude, 2.18);
  assert.equal(region.latitudeDelta, currentRegion.latitudeDelta);
  assert.equal(region.longitudeDelta, currentRegion.longitudeDelta);
});

test('moves the camera south so a station stays visible above a sheet', () => {
  const region = getViewportFocusedRegion(
    { latitude: 41.4, longitude: 2.18 },
    currentRegion,
    { height: 800, topInset: 160, bottomInset: 400 },
  );

  assert.ok(region.latitude < 41.4);
  assert.equal(region.longitude, 2.18);
});

test('accounts for both top controls and the bottom sheet', () => {
  const region = getViewportFocusedRegion(
    { latitude: 41.4, longitude: 2.18 },
    currentRegion,
    { height: 800, topInset: 240, bottomInset: 240 },
  );

  assert.equal(region.latitude, 41.4);
});

test('falls back to the selected coordinate before the map is measured', () => {
  const region = getViewportFocusedRegion(
    { latitude: 41.4, longitude: 2.18 },
    currentRegion,
    { height: 0, topInset: 160, bottomInset: 400 },
  );

  assert.deepEqual(region, {
    ...currentRegion,
    latitude: 41.4,
    longitude: 2.18,
  });
});
