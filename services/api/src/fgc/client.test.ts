import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  barcelonaWallClockToMs,
  parseLineRecords,
  parseScheduleRows,
} from './client';

describe('FGC data mappers', () => {
  it('keeps only the Barcelona-connected line allowlist', () => {
    const lines = parseLineRecords([
      {
        route_short_name: 'S1',
        route_long_name: 'Barcelona Pl. Catalunya - Terrassa Nacions Unides',
        route_color: 'EF7900',
      },
      {
        route_short_name: 'MM',
        route_long_name: 'Cremallera Montserrat',
        route_color: '000000',
      },
    ]);

    assert.equal(lines.length, 1);
    assert.equal(lines[0].code, 'S1');
    assert.equal(lines[0].operator, 'fgc');
    assert.equal(lines[0].network, 'barcelona-valles');
  });

  it('normalizes daily schedule rows and parent stations', () => {
    const rows = parseScheduleRows([
      {
        date: '2026-07-11',
        route_short_name: 'L6',
        trip_headsign: 'Sarrià',
        stop_name: 'Barcelona - Plaça Catalunya',
        stop_id: 'PC2',
        parent_station: 'PC',
        arrival_time: '12:34:00',
        stop_sequence: '1',
        shape_id: '100001',
        stop_lat: '41.38563194',
        stop_lon: '2.168720219',
        wheelchair_boarding: '1',
        platform_code: '2',
      },
    ]);

    assert.equal(rows.length, 1);
    assert.equal(rows[0].parentStation, 'PC');
    assert.equal(rows[0].platformCode, '2');
    assert.equal(rows[0].wheelchairBoarding, 1);
  });

  it('converts Barcelona summer wall-clock time to UTC', () => {
    assert.equal(
      new Date(barcelonaWallClockToMs('2026-07-11', '12:00:00')).toISOString(),
      '2026-07-11T10:00:00.000Z',
    );
  });
});
