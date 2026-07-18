import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readZipTextFiles } from './zip';

function createStoredZip(name: string, contents: string): Uint8Array {
  const nameBuffer = Buffer.from(name);
  const contentsBuffer = Buffer.from(contents);
  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt32LE(contentsBuffer.length, 18);
  localHeader.writeUInt32LE(contentsBuffer.length, 22);
  localHeader.writeUInt16LE(nameBuffer.length, 26);

  const centralHeader = Buffer.alloc(46);
  centralHeader.writeUInt32LE(0x02014b50, 0);
  centralHeader.writeUInt16LE(20, 4);
  centralHeader.writeUInt16LE(20, 6);
  centralHeader.writeUInt32LE(contentsBuffer.length, 20);
  centralHeader.writeUInt32LE(contentsBuffer.length, 24);
  centralHeader.writeUInt16LE(nameBuffer.length, 28);

  const centralOffset = localHeader.length + nameBuffer.length + contentsBuffer.length;
  const centralSize = centralHeader.length + nameBuffer.length;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralOffset, 16);

  return Buffer.concat([
    localHeader,
    nameBuffer,
    contentsBuffer,
    centralHeader,
    nameBuffer,
    end,
  ]);
}

describe('TRAM ZIP reader', () => {
  it('reads stored GTFS files', () => {
    const routes = 'route_id,route_short_name\n1,T1\n';
    const files = readZipTextFiles(createStoredZip('routes.txt', routes), ['routes.txt']);

    assert.equal(files.get('routes.txt'), routes);
  });

  it('fails explicitly when a required file is missing', () => {
    assert.throws(
      () => readZipTextFiles(createStoredZip('routes.txt', ''), ['stops.txt']),
      /missing stops\.txt/,
    );
  });
});
