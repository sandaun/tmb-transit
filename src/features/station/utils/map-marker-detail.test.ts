import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getMapMarkerDetail } from '@/src/features/station/utils/map-marker-detail';

describe('map marker detail', () => {
  it('shows full interchange detail at close zoom levels', () => {
    assert.equal(getMapMarkerDetail(0.035), 'full');
  });

  it('compacts interchange detail at medium zoom levels', () => {
    assert.equal(getMapMarkerDetail(0.05), 'compact');
  });

  it('hides interchange detail at distant zoom levels', () => {
    assert.equal(getMapMarkerDetail(0.081), 'minimal');
  });
});
