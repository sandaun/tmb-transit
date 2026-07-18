import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.TMB_APP_ID = process.env.TMB_APP_ID ?? 'test-app';
process.env.TMB_APP_KEY = process.env.TMB_APP_KEY ?? 'test-key';
process.env.TRAM_CLIENT_ID = process.env.TRAM_CLIENT_ID ?? 'test-client';
process.env.TRAM_CLIENT_SECRET = process.env.TRAM_CLIENT_SECRET ?? 'test-secret';

describe('TRAM data mappers', async () => {
  const {
    buildTramSnapshot,
    getScheduledArrivals,
    mapTramAlterations,
    mapTramRealtimeArrivals,
    refreshTramSnapshot,
  } = await import('./client');

  const rows = {
    routes: [
      { route_id: 'route-t3', route_short_name: 'T3', route_long_name: 'Sant Feliu - Francesc Macià', route_color: '00AEEF' },
      { route_id: 'route-t2', route_short_name: 'T2', route_long_name: 'Llevant_Les Planes-Francesc Macià', route_color: '84BD00' },
    ],
    stops: [
      { stop_id: 'parent-a', stop_name: 'Canonical A', stop_lat: '41.38', stop_lon: '2.12', location_type: '1' },
      { stop_id: 'platform-a1', stop_name: 'Platform A1', stop_lat: '41.3801', stop_lon: '2.1201', parent_station: 'parent-a', platform_code: '1' },
      { stop_id: 'platform-a2', stop_name: 'Platform A2', stop_lat: '41.3802', stop_lon: '2.1202', parent_station: 'parent-a', platform_code: '2' },
      { stop_id: 'parent-b', stop_name: 'Canonical B', stop_lat: '41.39', stop_lon: '2.14', location_type: '1' },
      { stop_id: 'platform-b1', stop_name: 'Platform B1', stop_lat: '41.3901', stop_lon: '2.1401', parent_station: 'parent-b', platform_code: '1' },
    ],
    trips: [
      { route_id: 'route-t3', service_id: 'active-service', trip_id: 'trip-t3', trip_headsign: 'Francesc Macià', direction_id: '1', shape_id: 'shape-t3' },
      { route_id: 'route-t2', service_id: 'inactive-service', trip_id: 'trip-t2', direction_id: '0', shape_id: 'shape-t2' },
    ],
    stopTimes: [
      { trip_id: 'trip-t3', stop_id: 'platform-a1', arrival_time: '12:00:00', departure_time: '12:00:30', stop_sequence: '1' },
      { trip_id: 'trip-t3', stop_id: 'platform-a2', arrival_time: '12:01:00', departure_time: '12:01:30', stop_sequence: '2' },
      { trip_id: 'trip-t3', stop_id: 'platform-b1', arrival_time: '12:05:00', departure_time: '12:05:30', stop_sequence: '3' },
      { trip_id: 'trip-t2', stop_id: 'platform-b1', arrival_time: '13:00:00', departure_time: '13:00:30', stop_sequence: '1' },
    ],
    calendarDates: [
      { service_id: 'active-service', date: '20260718', exception_type: '1' },
    ],
    shapes: [
      { shape_id: 'shape-t3', shape_pt_lat: '41.38', shape_pt_lon: '2.12', shape_pt_sequence: '1' },
      { shape_id: 'shape-t3', shape_pt_lat: '41.39', shape_pt_lon: '2.14', shape_pt_sequence: '2' },
    ],
  };

  it('builds canonical, ordered stations and service-aware lines', () => {
    const snapshot = buildTramSnapshot(
      { code: 'TBX', id: 1, name: 'trambaix' },
      rows,
      '2026-07-18',
      Date.parse('2026-07-18T09:00:00Z'),
    );

    assert.equal(snapshot.lines.length, 2);
    assert.equal(snapshot.lines.find((line) => line.code === 'T3')?.serviceStatus, 'active');
    assert.equal(snapshot.lines.find((line) => line.code === 'T2')?.serviceStatus, 'no-service');
    assert.deepEqual(
      snapshot.stationsByLine.get('T3')?.map((station) => [station.code, station.name]),
      [['parent-a', 'Canonical A'], ['parent-b', 'Canonical B']],
    );
    assert.equal(snapshot.segmentsByLine.get('T3')?.[0].points.length, 2);
    assert.equal(snapshot.tripsById.get('trip-t2')?.destination, 'Canonical B');
    assert.deepEqual(
      snapshot.lines.find((line) => line.code === 'T2'),
      {
        code: 'T2',
        name: 'Llevant | Les Planes - Francesc Macià',
        color: '009189',
        textColor: 'FFFFFF',
        mode: 'tram',
        operator: 'tram',
        vehicleMode: 'tram',
        network: 'trambaix',
        originStation: 'Llevant | Les Planes',
        destinationStation: 'Francesc Macià',
        serviceStatus: 'no-service',
      },
    );
  });

  it('maps realtime platform predictions and scheduled fallback arrivals', () => {
    const snapshot = buildTramSnapshot(
      { code: 'TBX', id: 1, name: 'trambaix' },
      rows,
      '2026-07-18',
    );
    const nowMs = Date.parse('2026-07-18T09:59:00Z');
    const realtime = mapTramRealtimeArrivals(
      snapshot,
      {
        entity: [{
          trip_update: {
            timestamp: String(nowMs / 1_000),
            trip: { trip_id: 'trip-t3', schedule_relationship: 'SCHEDULED' },
            stop_time_update: [{
              stop_id: 'platform-a1',
              arrival: { time: String(nowMs / 1_000 + 120), delay: 30 },
            }],
          },
        }],
      },
      'T3',
      'parent-a',
      nowMs,
    );
    const scheduled = getScheduledArrivals(snapshot, 'T3', 'parent-a', nowMs);

    assert.equal(realtime.length, 1);
    assert.equal(realtime[0].etaSec, 120);
    assert.equal(realtime[0].delaySec, 30);
    assert.equal(realtime[0].destination, 'Francesc Macià');
    assert.equal(scheduled[0].realtimeStatus, 'scheduled');
    assert.equal(scheduled[0].platformCode, '1');
  });

  it('maps realtime trips when the daily GTFS trip id has drifted', () => {
    const snapshot = buildTramSnapshot(
      { code: 'TBX', id: 1, name: 'trambaix' },
      rows,
      '2026-07-18',
    );
    const nowMs = Date.parse('2026-07-18T09:59:00Z');
    const realtime = mapTramRealtimeArrivals(
      snapshot,
      {
        entity: [{
          trip_update: {
            trip: {
              trip_id: 'live-trip-with-different-service-id',
              route_id: 'route-t3',
              direction_id: 1,
            },
            stop_time_update: [
              { stop_id: 'platform-a1', arrival: { time: String(nowMs / 1_000 + 90) } },
              { stop_id: 'platform-b1', arrival: { time: String(nowMs / 1_000 + 300) } },
            ],
          },
        }],
      },
      'T3',
      'parent-a',
      nowMs,
    );

    assert.equal(realtime.length, 1);
    assert.equal(realtime[0].destination, 'Francesc Macià');
    assert.equal(realtime[0].directionId, '1');
    assert.equal(realtime[0].realtimeStatus, 'realtime');
  });

  it('maps documented and numeric alterations with localized text', () => {
    const mapped = mapTramAlterations([
      {
        id: 'numeric',
        type: 0,
        title: { ca: 'Alteració T4', es: 'Alteración T4', en: 'T4 alteration' },
        description: { ca: 'Consulta https://www.tram.cat/avis', es: 'Consulta el aviso' },
        lines: ['T4', 'invalid'],
      },
      {
        id: 'documented',
        type: 'Information',
        title: 'Service information',
        description: 'No service impact',
        lines: ['T5', 'T6'],
      },
    ], 'ca', 123);

    assert.equal(mapped.length, 2);
    assert.equal(mapped[0].title, 'Alteració T4');
    assert.equal(mapped[0].severity, 'warning');
    assert.deepEqual(mapped[0].affectedLines.map((line) => line.code), ['T4']);
    assert.equal(mapped[0].sourceUrl, 'https://www.tram.cat/avis');
    assert.equal(mapped[1].severity, 'info');
    assert.equal(mapped[1].operator, 'tram');
  });

  it('uses a recent stale snapshot and fails without usable cache', async () => {
    const network = { code: 'TBX', id: 1, name: 'trambaix' } as const;
    const cached = buildTramSnapshot(network, rows, '2026-07-17', 1_000);
    const failure = async () => {
      throw new Error('network unavailable');
    };

    assert.equal(
      await refreshTramSnapshot(network, '2026-07-18', 2 * 24 * 60 * 60_000, cached, failure),
      cached,
    );
    await assert.rejects(
      () => refreshTramSnapshot(network, '2026-07-18', 8 * 24 * 60 * 60_000, cached, failure),
      /network unavailable/,
    );
    await assert.rejects(
      () => refreshTramSnapshot(network, '2026-07-18', 2_000, undefined, failure),
      /network unavailable/,
    );
  });
});
