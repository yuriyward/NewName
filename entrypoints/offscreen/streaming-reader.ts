/**
 * Streaming reader for media files that supports early cancellation.
 * Works with any server (Range-supporting or not) by buffering a forward-only stream.
 */

export class StreamingReader {
  private buffer: Uint8Array[] = [];
  private bytesBuffered = 0;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private abortController: AbortController;
  private streamComplete = false;
  private streamError: Error | null = null;
  private pendingRead: Promise<void> | null = null;

  constructor(
    private readonly url: string,
    private readonly onProgress?: (bytesRead: number) => void,
  ) {
    this.abortController = new AbortController();
  }

  /**
   * Initialize the stream and start buffering
   */
  async initialize(): Promise<void> {
    const response = await fetch(this.url, {
      signal: this.abortController.signal,
      cache: 'no-store',
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    this.reader = response.body.getReader();
  }

  /**
   * Read a chunk of data at the specified offset.
   * Buffers data from the stream until we have enough to fulfill the request.
   */
  async read(size: number, offset: number): Promise<Uint8Array> {
    if (this.streamError) {
      throw this.streamError;
    }

    // Buffer data until we have enough
    while (this.bytesBuffered < offset + size && !this.streamComplete) {
      try {
        await this.readNextChunk();
      } catch (error) {
        this.streamError =
          error instanceof Error ? error : new Error('Stream read failed');
        throw this.streamError;
      }
    }

    // If stream completed but we don't have enough data, return what we have
    if (this.bytesBuffered < offset + size) {
      if (offset >= this.bytesBuffered) {
        // Offset is beyond our data - return empty
        return new Uint8Array(0);
      }
      // Return partial data up to end of buffer
      size = this.bytesBuffered - offset;
    }

    // Extract requested range from buffer
    return this.extractFromBuffer(offset, size);
  }

  /**
   * Get the total size of the file (if known, otherwise undefined)
   */
  getSize(): number | undefined {
    // We don't know size until stream completes
    return this.streamComplete ? this.bytesBuffered : undefined;
  }

  /**
   * Cancel the stream and stop downloading
   */
  cancel(): void {
    if (this.reader) {
      void this.reader.cancel();
      this.reader = null;
    }
    this.abortController.abort();
  }

  /**
   * Get total bytes buffered so far
   */
  getBytesBuffered(): number {
    return this.bytesBuffered;
  }

  /**
   * Check if stream has completed
   */
  isComplete(): boolean {
    return this.streamComplete;
  }

  private async readNextChunk(): Promise<void> {
    if (!this.reader) {
      throw new Error('Reader not initialized');
    }

    // Prevent concurrent reads
    if (this.pendingRead) {
      await this.pendingRead;
      return;
    }

    this.pendingRead = (async () => {
      try {
        if (!this.reader) {
          throw new Error('Reader is null');
        }
        const { done, value } = await this.reader.read();

        if (done) {
          this.streamComplete = true;
          return;
        }

        if (value) {
          this.buffer.push(value);
          this.bytesBuffered += value.length;

          if (this.onProgress) {
            this.onProgress(this.bytesBuffered);
          }
        }
      } finally {
        this.pendingRead = null;
      }
    })();

    await this.pendingRead;
  }

  private extractFromBuffer(offset: number, size: number): Uint8Array {
    const result = new Uint8Array(size);
    let resultOffset = 0;
    let remainingBytes = size;
    let currentOffset = 0;

    for (const chunk of this.buffer) {
      const chunkEnd = currentOffset + chunk.length;

      // Skip chunks before our offset
      if (chunkEnd <= offset) {
        currentOffset = chunkEnd;
        continue;
      }

      // Calculate overlap with requested range
      const startInChunk = Math.max(0, offset - currentOffset);
      const endInChunk = Math.min(chunk.length, offset + size - currentOffset);
      const bytesToCopy = endInChunk - startInChunk;

      if (bytesToCopy > 0) {
        result.set(chunk.subarray(startInChunk, endInChunk), resultOffset);
        resultOffset += bytesToCopy;
        remainingBytes -= bytesToCopy;
      }

      currentOffset = chunkEnd;

      // Stop if we've copied everything
      if (remainingBytes <= 0) {
        break;
      }
    }

    return result;
  }
}
