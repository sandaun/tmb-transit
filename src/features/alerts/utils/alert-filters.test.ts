import assert from 'node:assert/strict';
import test from 'node:test';

import type { ServiceAlert } from '@/src/domain/alerts/models';
import {
  alertMatchesFilters,
  getAlertFilterCounts,
  type AlertFilters,
} from '@/src/features/alerts/utils/alert-filters';

function createAlert(
  id: string,
  kind: ServiceAlert['kind'],
  operator: ServiceAlert['operator'],
  lineCode: string,
): ServiceAlert {
  const mode = operator === 'tram' ? 'tram' : operator === 'fgc' ? 'fgc' : 'metro';
  return {
    id,
    title: id,
    description: id,
    mode,
    operator,
    severity: 'info',
    kind,
    affectedLines: [{ mode, code: lineCode }],
    source: operator === 'tram'
      ? 'tram-alterations'
      : operator === 'fgc'
        ? 'fgc-gtfs-rt'
        : 'tmb-alerts-api',
  };
}

const alerts = [
  createAlert('current-tmb', 'current', 'tmb', 'L1'),
  createAlert('planned-tmb', 'planned', 'tmb', 'L2'),
  createAlert('current-fgc', 'current', 'fgc', 'S1'),
  createAlert('current-tram', 'current', 'tram', 'T4'),
];
const favoriteLineKeys = new Set(['metro:L2', 'fgc:S1', 'tram:T4']);

test('combines time, operator and personal alert filters', () => {
  const filters: AlertFilters = { time: 'current', operator: 'fgc', mineOnly: true };

  assert.deepEqual(
    alerts.filter((alert) => alertMatchesFilters(alert, filters, favoriteLineKeys)).map((alert) => alert.id),
    ['current-fgc'],
  );
});

test('computes counts in the context of the other selected filters', () => {
  const counts = getAlertFilterCounts(
    alerts,
    { time: 'planned', operator: 'all', mineOnly: false },
    favoriteLineKeys,
  );

  assert.deepEqual(counts.time, { all: 4, current: 3, planned: 1 });
  assert.deepEqual(counts.operator, { all: 1, tmb: 1, fgc: 0, tram: 0 });
  assert.equal(counts.mine, 1);
});

test('updates every count when the personal filter is active', () => {
  const counts = getAlertFilterCounts(
    alerts,
    { time: 'all', operator: 'all', mineOnly: true },
    favoriteLineKeys,
  );

  assert.deepEqual(counts.time, { all: 3, current: 2, planned: 1 });
  assert.deepEqual(counts.operator, { all: 3, tmb: 1, fgc: 1, tram: 1 });
  assert.equal(counts.mine, 3);
});
