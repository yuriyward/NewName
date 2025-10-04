import mediaInfoFactory, { type MediaInfo } from 'mediainfo.js';
import wasmUrl from 'mediainfo.js/MediaInfoModule.wasm?url';

export type MediaInfoInstance = MediaInfo<'object'>;

export const MEDIAINFO_CHUNK_SIZE = 512 * 1024;

let cachedInstance: Promise<MediaInfoInstance> | null = null;

function resolveViaRuntime(fileName: string): string | null {
  const maybeChrome = (
    globalThis as unknown as {
      chrome?: { runtime?: { getURL(path: string): string } };
    }
  ).chrome;
  const runtimeUrl = maybeChrome?.runtime?.getURL;
  if (typeof runtimeUrl === 'function') {
    return runtimeUrl(`wasm/${fileName}`);
  }
  return null;
}

function resolveWasmUrl(fileName: string): string {
  if (fileName.endsWith('.wasm')) {
    return resolveViaRuntime(fileName) ?? wasmUrl;
  }
  return fileName;
}

export function getMediaInfoInstance(): Promise<MediaInfoInstance> {
  if (!cachedInstance) {
    cachedInstance = mediaInfoFactory({
      format: 'object',
      chunkSize: MEDIAINFO_CHUNK_SIZE,
      locateFile: resolveWasmUrl,
    }).catch((error) => {
      cachedInstance = null;
      throw error;
    });
  }
  return cachedInstance;
}

export function resetMediaInfoInstanceForTesting(): void {
  cachedInstance = null;
}
