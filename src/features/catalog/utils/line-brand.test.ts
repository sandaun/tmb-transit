import assert from 'node:assert/strict';
import test from 'node:test';

import { getLineBrand } from '@/src/features/catalog/utils/line-brand';

test('uses the corporate color for every TRAM line', () => {
  assert.deepEqual(getLineBrand('tram', 'T1', 'FF0D0D'), {
    label: 'T1',
    backgroundColor: '#009189',
    textColor: '#FFFFFF',
  });
  assert.deepEqual(getLineBrand('tram', 'T2', '80FF80'), {
    label: 'T2',
    backgroundColor: '#009189',
    textColor: '#FFFFFF',
  });
});
