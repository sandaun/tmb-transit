import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Line, Station } from '@/src/domain/catalog/models';
import {
  buildStationInterchanges,
  findStationInterchange,
  getUniqueInterchangeLines,
  prioritizeSelectedInterchangeMember,
  type StationInterchangeMember,
} from '@/src/features/station/utils/station-interchanges';

const lines: Line[] = [
  { code: 'L3', name: 'L3', mode: 'metro' },
  { code: 'L5', name: 'L5', mode: 'metro' },
];

function makeStation(
  lineCode: string,
  code: string,
  name: string,
  lat: number,
  lon: number,
): Station {
  return {
    code,
    lineCode,
    mode: 'metro',
    name,
    lat,
    lon,
  };
}

describe('station interchanges', () => {
  it('groups nearby stations with the same normalized name', () => {
    const stationsByLine = new Map<string, Station[]>([
      [
        'L3',
        [makeStation('L3', 'sants-l3', 'Sants Estació', 41.379, 2.14)],
      ],
      [
        'L5',
        [makeStation('L5', 'sants-l5', 'Sants Estacio', 41.3795, 2.1404)],
      ],
    ]);

    const interchanges = buildStationInterchanges(lines, stationsByLine);
    const sants = findStationInterchange(interchanges, 'L3', 'sants-l3');

    assert.equal(sants?.members.length, 2);
    assert.deepEqual(
      sants?.members.map((member) => member.line.code),
      ['L3', 'L5'],
    );
  });

  it('keeps stations with the same name separate when they are far apart', () => {
    const stationsByLine = new Map<string, Station[]>([
      ['L3', [makeStation('L3', 'same-l3', 'Same', 41.379, 2.14)]],
      ['L5', [makeStation('L5', 'same-l5', 'Same', 41.45, 2.2)]],
    ]);

    const interchanges = buildStationInterchanges(lines, stationsByLine);

    assert.equal(interchanges.length, 2);
  });

  it('groups stations within a realistic interchange walking distance', () => {
    const stationsByLine = new Map<string, Station[]>([
      [
        'L3',
        [
          makeStation(
            'L3',
            'sants-l3',
            'Sants Estació',
            41.38159825,
            2.14099226,
          ),
        ],
      ],
      [
        'L5',
        [
          makeStation(
            'L5',
            'sants-l5',
            'Sants Estació',
            41.37995554,
            2.14039813,
          ),
        ],
      ],
    ]);

    const interchanges = buildStationInterchanges(lines, stationsByLine);
    const sants = findStationInterchange(interchanges, 'L3', 'sants-l3');

    assert.equal(sants?.members.length, 2);
  });

  it('places the selected line first without changing the remaining order', () => {
    const members: StationInterchangeMember[] = [
      {
        line: lines[0],
        station: makeStation('L3', 'sants-l3', 'Sants Estació', 41.379, 2.14),
      },
      {
        line: lines[1],
        station: makeStation('L5', 'sants-l5', 'Sants Estació', 41.3795, 2.1404),
      },
      {
        line: { code: 'L9S', name: 'L9 Sud', mode: 'metro' },
        station: makeStation('L9S', 'sants-l9s', 'Sants Estació', 41.3794, 2.1403),
      },
    ];

    const orderedMembers = prioritizeSelectedInterchangeMember(members, 'L5');

    assert.deepEqual(
      orderedMembers.map((member) => member.line.code),
      ['L5', 'L3', 'L9S'],
    );
    assert.deepEqual(
      members.map((member) => member.line.code),
      ['L3', 'L5', 'L9S'],
    );
  });

  it('deduplicates platforms belonging to the same operator line', () => {
    const s1: Line = { code: 'S1', name: 'S1', mode: 'fgc' };
    const members: StationInterchangeMember[] = [
      {
        line: s1,
        station: { ...makeStation('S1', 'NA1', 'Terrassa Nacions Unides', 41.584, 2.052), mode: 'fgc' },
      },
      {
        line: s1,
        station: { ...makeStation('S1', 'NA2', 'Terrassa Nacions Unides', 41.5841, 2.0521), mode: 'fgc' },
      },
      {
        line: lines[0],
        station: makeStation('L3', 'transfer-l3', 'Transfer', 41.38, 2.14),
      },
    ];

    assert.deepEqual(
      getUniqueInterchangeLines(members).map((line) => `${line.mode}:${line.code}`),
      ['fgc:S1', 'metro:L3'],
    );
  });
});
