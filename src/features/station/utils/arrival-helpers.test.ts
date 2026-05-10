import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Arrival } from '@/src/domain/realtime/models';
import { getLiveEtaSec } from '@/src/features/station/utils/arrival-helpers';

const arrival: Arrival = {
  lineCode: 'L3',
  stationCode: '001',
  mode: 'metro',
  directionId: '1',
  destination: 'Zona Universitaria',
  etaSec: 90,
  sourceTimestampMs: 1_000,
};

describe('getLiveEtaSec', () => {
  it('subtracts elapsed seconds from the arrival eta', () => {
    assert.equal(getLiveEtaSec(arrival, 11_500), 80);
  });

  it('does not return a negative eta', () => {
    assert.equal(getLiveEtaSec(arrival, 120_000), 0);
  });
});
