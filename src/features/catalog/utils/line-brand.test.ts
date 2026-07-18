import assert from 'node:assert/strict';
import test from 'node:test';

import { getLineBrand } from '@/src/features/catalog/utils/line-brand';

test('uses GTFS colors for TRAM line badges', () => {
  assert.deepEqual(getLineBrand('tram', 'T1', 'FF0D0D'), {
    label: 'T1',
    backgroundColor: '#FF0D0D',
    textColor: '#FFFFFF',
  });
  assert.deepEqual(getLineBrand('tram', 'T2', '80FF80'), {
    label: 'T2',
    backgroundColor: '#80FF80',
    textColor: '#111827',
  });
});
