import assert from 'node:assert/strict';
import test from 'node:test';

import { translate } from '@/src/i18n';

test('translates parameterized strings in each supported language', () => {
  assert.equal(translate('ca', 'station_platform', { platform: '2' }), 'Andana 2');
  assert.equal(translate('en', 'station_platform', { platform: '2' }), 'Platform 2');
  assert.equal(translate('es', 'station_platform', { platform: '2' }), 'Andén 2');
});
