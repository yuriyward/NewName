/**
 * Generic HTTP range fetch utilities shared across integrations.
 *
 * Designed to support resumable, partial reads without forcing the caller to download
 * full files when the remote server advertises byte range support.
 */

export interface RangeFetchOptions {
  readonly signal?: AbortSignal;
  readonly headers?: Record<string, string>;
  readonly credentials?: RequestCredentials;
}

export interface RangeFetchResult {
  readonly bytes: Uint8Array;
  readonly totalSize?: number;
  readonly start: number;
  readonly end: number;
}

function parseContentRange(value: string | null): number | undefined {
  if (!value) return undefined;
  const match = value.match(/bytes\s+\d+-\d+\/(\d+|\*)/i);
  if (!match) return undefined;
  const [, total] = match;
  if (!total || total === '*') return undefined;
  const size = Number.parseInt(total, 10);
  return Number.isFinite(size) ? size : undefined;
}

function coercePositiveInt(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value)) return undefined;
  return value >= 0 ? Math.trunc(value) : undefined;
}

export class RangeFetchReader {
  private readonly options: RangeFetchOptions;

  private readonly chunkSize: number;

  private readonly cache = new Map<number, Uint8Array>();

  private headAttempted = false;

  private size: number | undefined;

  private totalFetched = 0;

  private requestCount = 0;

  private rangeSupported: boolean | undefined;

  constructor(
    private readonly url: string,
    { chunkSize, ...options }: RangeFetchOptions & { chunkSize: number },
  ) {
    this.options = options;
    this.chunkSize = chunkSize;
  }

  get bytesFetched(): number {
    return this.totalFetched;
  }

  get requests(): number {
    return this.requestCount;
  }

  get totalSize(): number | undefined {
    return this.size;
  }

  get supportsRanges(): boolean | undefined {
    return this.rangeSupported;
  }

  async ensureSize(): Promise<number> {
    if (this.size !== undefined) {
      return this.size;
    }

    if (!this.headAttempted) {
      this.headAttempted = true;
      const headSize = await this.tryHeadRequest();
      if (headSize !== undefined) {
        this.size = headSize;
        return headSize;
      }
    }

    const fallback = await this.fetchRange(0, this.chunkSize);
    if (fallback.bytes.length > 0) {
      this.storeChunk(0, fallback.bytes);
    }
    if (fallback.totalSize !== undefined) {
      this.size = fallback.totalSize;
    } else if (this.size === undefined) {
      this.size = fallback.bytes.length;
    }
    return this.size ?? 0;
  }

  async read(chunkSize: number, offset: number): Promise<Uint8Array> {
    if (chunkSize <= 0) return new Uint8Array();
    if (this.size !== undefined && offset >= this.size) {
      return new Uint8Array();
    }

    const cached = this.consumeCached(offset, chunkSize);
    if (cached) {
      return cached;
    }

    const rangeSize =
      this.size !== undefined
        ? Math.min(chunkSize, Math.max(this.size - offset, 0))
        : chunkSize;

    if (rangeSize <= 0) {
      return new Uint8Array();
    }

    const result = await this.fetchRange(offset, rangeSize);

    if (result.totalSize !== undefined) {
      this.size = result.totalSize;
    }

    if (result.bytes.length > chunkSize) {
      const slice = result.bytes.subarray(0, chunkSize);
      const remainder = result.bytes.subarray(chunkSize);
      if (remainder.length > 0) {
        this.storeChunk(offset + chunkSize, remainder);
      }
      return slice;
    }

    if (
      result.bytes.length < chunkSize &&
      this.size !== undefined &&
      offset + result.bytes.length < this.size
    ) {
      const missing = chunkSize - result.bytes.length;
      const tail = await this.fetchRange(offset + result.bytes.length, missing);
      if (tail.totalSize !== undefined) {
        this.size = tail.totalSize;
      }
      if (tail.bytes.length > 0) {
        const merged = new Uint8Array(result.bytes.length + tail.bytes.length);
        merged.set(result.bytes, 0);
        merged.set(tail.bytes, result.bytes.length);
        if (merged.length > chunkSize) {
          const first = merged.subarray(0, chunkSize);
          const leftover = merged.subarray(chunkSize);
          if (leftover.length > 0) {
            this.storeChunk(offset + chunkSize, leftover);
          }
          return first;
        }
        return merged;
      }
    }

    return result.bytes;
  }

  private async tryHeadRequest(): Promise<number | undefined> {
    try {
      const response = await fetch(this.url, {
        method: 'HEAD',
        credentials: this.options.credentials ?? 'include',
        headers: this.options.headers,
        signal: this.options.signal,
        cache: 'no-store',
        mode: 'cors',
      });
      if (!response.ok) return undefined;
      const lengthHeader = response.headers.get('content-length');
      if (!lengthHeader) return undefined;
      const parsed = Number.parseInt(lengthHeader, 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  private async fetchRange(
    offset: number,
    length: number,
  ): Promise<RangeFetchResult> {
    const safeLength = Math.max(length, 0);
    const endExclusive =
      this.size !== undefined
        ? Math.min(offset + safeLength, this.size)
        : offset + safeLength;
    const end = Math.max(endExclusive - 1, offset);
    const headers = new Headers(this.options.headers);
    if (safeLength > 0) {
      headers.set('Range', `bytes=${offset}-${end}`);
    }

    const response = await fetch(this.url, {
      method: 'GET',
      credentials: this.options.credentials ?? 'include',
      headers,
      signal: this.options.signal,
      cache: 'no-store',
      mode: 'cors',
    });

    if (safeLength > 0 && response.status === 200) {
      this.rangeSupported = false;
      throw new Error(
        'Server does not support range requests (responded with 200 OK instead of 206 Partial Content). Aborting to avoid downloading entire file.',
      );
    }

    if (response.status === 206) {
      this.rangeSupported = true;
    }

    if (!response.ok && response.status !== 206) {
      if (response.status === 416) {
        return {
          bytes: new Uint8Array(),
          totalSize: this.size,
          start: offset,
          end: offset - 1,
        };
      }
      throw new Error(`Range request failed with status ${response.status}`);
    }

    const buffer = new Uint8Array(await response.arrayBuffer());

    this.totalFetched += buffer.length;
    this.requestCount += 1;

    const contentRangeSize = parseContentRange(
      response.headers.get('content-range'),
    );
    if (contentRangeSize !== undefined) {
      return {
        bytes: buffer,
        totalSize: contentRangeSize,
        start: offset,
        end: offset + buffer.length - 1,
      };
    }

    const explicitLength = coercePositiveInt(this.size);
    if (explicitLength !== undefined) {
      return {
        bytes: buffer,
        totalSize: explicitLength,
        start: offset,
        end: offset + buffer.length - 1,
      };
    }

    const contentLengthHeader = response.headers.get('content-length');
    if (response.status === 200 && contentLengthHeader) {
      const parsed = Number.parseInt(contentLengthHeader, 10);
      if (Number.isFinite(parsed)) {
        return {
          bytes: buffer,
          totalSize: parsed,
          start: offset,
          end: offset + buffer.length - 1,
        };
      }
    }

    return {
      bytes: buffer,
      totalSize: undefined,
      start: offset,
      end: offset + buffer.length - 1,
    };
  }

  private storeChunk(offset: number, bytes: Uint8Array): void {
    if (bytes.length === 0) return;
    this.cache.set(offset, bytes);
  }

  private consumeCached(
    offset: number,
    length: number,
  ): Uint8Array | undefined {
    const cached = this.cache.get(offset);
    if (!cached) return undefined;
    this.cache.delete(offset);
    if (cached.length === length) {
      return cached;
    }
    if (cached.length > length) {
      const slice = cached.subarray(0, length);
      const remainder = cached.subarray(length);
      if (remainder.length > 0) {
        this.cache.set(offset + length, remainder);
      }
      return slice;
    }
    return cached;
  }
}

/**
 * Convenience helper for fetching a leading byte range without managing reader state.
 */
export async function fetchInitialRange(
  url: string,
  length: number,
  options: RangeFetchOptions = {},
): Promise<RangeFetchResult> {
  const reader = new RangeFetchReader(url, { chunkSize: length, ...options });
  const bytes = await reader.read(length, 0);
  return {
    bytes,
    totalSize: reader.totalSize,
    start: 0,
    end: bytes.length > 0 ? bytes.length - 1 : -1,
  };
}
