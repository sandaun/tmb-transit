import { inflateRawSync } from 'node:zlib';

const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const LOCAL_FILE_SIGNATURE = 0x04034b50;
const MAX_END_RECORD_SIZE = 65_557;

function findEndOfCentralDirectory(buffer: Buffer): number {
  const lowerBound = Math.max(0, buffer.length - MAX_END_RECORD_SIZE);
  for (let offset = buffer.length - 22; offset >= lowerBound; offset -= 1) {
    if (buffer.readUInt32LE(offset) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      return offset;
    }
  }
  throw new Error('Invalid ZIP archive: central directory not found');
}

export function readZipTextFiles(
  bytes: Uint8Array,
  requestedNames: readonly string[],
): Map<string, string> {
  const buffer = Buffer.from(bytes);
  const endOffset = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  let directoryOffset = buffer.readUInt32LE(endOffset + 16);
  const requested = new Set(requestedNames);
  const result = new Map<string, string>();

  for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
    if (buffer.readUInt32LE(directoryOffset) !== CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error('Invalid ZIP archive: malformed central directory');
    }
    const compressionMethod = buffer.readUInt16LE(directoryOffset + 10);
    const compressedSize = buffer.readUInt32LE(directoryOffset + 20);
    const fileNameLength = buffer.readUInt16LE(directoryOffset + 28);
    const extraLength = buffer.readUInt16LE(directoryOffset + 30);
    const commentLength = buffer.readUInt16LE(directoryOffset + 32);
    const localHeaderOffset = buffer.readUInt32LE(directoryOffset + 42);
    const nameStart = directoryOffset + 46;
    const name = buffer.subarray(nameStart, nameStart + fileNameLength).toString('utf8');

    if (requested.has(name)) {
      if (buffer.readUInt32LE(localHeaderOffset) !== LOCAL_FILE_SIGNATURE) {
        throw new Error(`Invalid ZIP archive: malformed local header for ${name}`);
      }
      const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
      const contents = compressionMethod === 0
        ? compressed
        : compressionMethod === 8
          ? inflateRawSync(compressed)
          : null;
      if (!contents) {
        throw new Error(`Unsupported ZIP compression method ${compressionMethod} for ${name}`);
      }
      result.set(name, contents.toString('utf8'));
    }

    directoryOffset = nameStart + fileNameLength + extraLength + commentLength;
  }

  for (const name of requested) {
    if (!result.has(name)) {
      throw new Error(`ZIP archive is missing ${name}`);
    }
  }
  return result;
}
