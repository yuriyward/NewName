/**
 * Lightweight text encoding helpers used during file ingestion.
 */

export type TextEncoding = 'utf-8' | 'utf-16le' | 'utf-16be' | 'windows-1252';

export interface DetectedTextEncoding {
  encoding: TextEncoding;
  bomLength: number;
}

const UTF8_BOM = [0xef, 0xbb, 0xbf];
const UTF16LE_BOM = [0xff, 0xfe];
const UTF16BE_BOM = [0xfe, 0xff];

function hasPrefix(buffer: Uint8Array, prefix: number[]): boolean {
  if (buffer.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i += 1) {
    if (buffer[i] !== prefix[i]) {
      return false;
    }
  }
  return true;
}

function detectUtf16ByNullPattern(
  buffer: Uint8Array,
): TextEncoding | undefined {
  const inspectLength = Math.min(buffer.length, 64);
  if (inspectLength < 4) return undefined;

  let evenNulls = 0;
  let oddNulls = 0;
  for (let i = 0; i < inspectLength; i += 1) {
    if (buffer[i] === 0) {
      if (i % 2 === 0) {
        evenNulls += 1;
      } else {
        oddNulls += 1;
      }
    }
  }

  // Bias towards UTF-16 when one parity is mostly zero while the other parity has content.
  const threshold = inspectLength / 8;
  if (evenNulls > threshold && oddNulls === 0) {
    return 'utf-16be';
  }
  if (oddNulls > threshold && evenNulls === 0) {
    return 'utf-16le';
  }
  return undefined;
}

export function detectTextEncoding(
  buffer: Uint8Array,
  fallback: TextEncoding = 'utf-8',
): DetectedTextEncoding {
  if (hasPrefix(buffer, UTF8_BOM)) {
    return { encoding: 'utf-8', bomLength: UTF8_BOM.length };
  }
  if (hasPrefix(buffer, UTF16LE_BOM)) {
    return { encoding: 'utf-16le', bomLength: UTF16LE_BOM.length };
  }
  if (hasPrefix(buffer, UTF16BE_BOM)) {
    return { encoding: 'utf-16be', bomLength: UTF16BE_BOM.length };
  }

  const utf16Heuristic = detectUtf16ByNullPattern(buffer);
  if (utf16Heuristic) {
    return { encoding: utf16Heuristic, bomLength: 0 };
  }

  return { encoding: fallback, bomLength: 0 };
}

export interface DecodeTextBufferOptions {
  defaultEncoding?: TextEncoding;
  fatal?: boolean;
}

export interface DecodeTextBufferResult {
  text: string;
  encoding: TextEncoding;
  bomLength: number;
}

function decodeWithEncoding(
  data: Uint8Array,
  encoding: TextEncoding,
  fatal: boolean,
): string {
  const decoder = new TextDecoder(encoding, { fatal });
  return decoder.decode(data);
}

export function decodeTextBuffer(
  buffer: Uint8Array,
  options: DecodeTextBufferOptions = {},
): DecodeTextBufferResult {
  const { defaultEncoding = 'utf-8', fatal = false } = options;
  const detection = detectTextEncoding(buffer, defaultEncoding);
  const slice =
    detection.bomLength > 0
      ? buffer.subarray(detection.bomLength)
      : buffer.subarray(0);

  try {
    const text = decodeWithEncoding(slice, detection.encoding, fatal);
    return {
      text,
      encoding: detection.encoding,
      bomLength: detection.bomLength,
    };
  } catch (_error) {
    if (detection.encoding !== 'windows-1252') {
      try {
        const latinText = decodeWithEncoding(slice, 'windows-1252', false);
        return {
          text: latinText,
          encoding: 'windows-1252',
          bomLength: detection.bomLength,
        };
      } catch {
        // Fall through to UTF-8 best effort
      }
    }

    const fallbackText = decodeWithEncoding(slice, 'utf-8', false);
    return {
      text: fallbackText,
      encoding: 'utf-8',
      bomLength: detection.bomLength,
    };
  }
}

export function stripBom(
  buffer: Uint8Array,
  detected?: DetectedTextEncoding,
): Uint8Array {
  const info = detected ?? detectTextEncoding(buffer);
  if (info.bomLength <= 0) {
    return buffer;
  }
  return buffer.subarray(info.bomLength);
}
