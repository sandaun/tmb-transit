import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mapBusAlert, mapMetroAlert } from './alerts-client';

describe('TMB alerts API mappers', () => {
  it('maps metro alert API responses to service alerts', () => {
    const alert = mapMetroAlert({
      categories: {
        effect_status: 'WARNING',
        effect_type: 'TRAFFIC',
      },
      disruption_dates: [
        {
          begin_date: 1_782_356_400_000,
          end_date: 1_788_139_800_000,
        },
      ],
      entities: [
        { line_code: '104', line_name: 'L10N' },
        { line_code: '94', line_name: 'L9N' },
      ],
      id: 225594,
      publications: [
        {
          headerCa: 'NP3 Linia amb Servei Parcial',
          textCa: 'Per obres de millora, afectacions a les línies L9 Nord i L10 Nord.',
        },
      ],
      tstamp: 1_782_748_848_000,
    });

    assert.ok(alert);
    assert.equal(alert.id, 'tmb-alerts-api:metro:225594');
    assert.equal(alert.title, 'Linia amb Servei Parcial');
    assert.equal(alert.mode, 'metro');
    assert.equal(alert.kind, 'current');
    assert.equal(alert.source, 'tmb-alerts-api');
    assert.deepEqual(alert.affectedLines, [
      { mode: 'metro', code: 'L10N' },
      { mode: 'metro', code: 'L9N' },
    ]);
  });

  it('maps bus alert API responses to service alerts', () => {
    const alert = mapBusAlert({
      begin: 1_765_494_000_000,
      categories: {
        messageType: 'ALTERATION',
      },
      causeName: 'Obres',
      channelInfoTO: {
        textCa:
          "A partir d'aquesta data, la línia H12 canvia el recorregut temporalment.<br>Parades anul·lades.",
      },
      id: 134760,
      linesAffected: [
        {
          commercialLineId: 'H12',
        },
      ],
      modified: 1_772_798_493_000,
      typeName: 'Modificació del recorregut',
    });

    assert.ok(alert);
    assert.equal(alert.id, 'tmb-alerts-api:bus:134760');
    assert.equal(alert.title, 'Modificació del recorregut');
    assert.equal(alert.description.includes('<br>'), false);
    assert.equal(alert.mode, 'bus');
    assert.equal(alert.kind, 'current');
    assert.deepEqual(alert.affectedLines, [{ mode: 'bus', code: 'H12' }]);
  });
});
