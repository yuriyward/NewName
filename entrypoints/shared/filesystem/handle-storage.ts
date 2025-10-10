/**
 * Persist and retrieve File System Access handles using IndexedDB.
 *
 * File system handles are structured-clone serialisable and must live in
 * IndexedDB (not chrome.storage.local) so that they can be restored in
 * offscreen documents and service workers.
 */
import { createStore, del, get, set } from 'idb-keyval';

const STORE_NAME = 'newname-filesystem';
const STORE_OBJECT_STORE = 'handles';

const fsStore = createStore(STORE_NAME, STORE_OBJECT_STORE);

export interface StoredHandleInfo {
  handle: FileSystemDirectoryHandle;
  grantedAt: number;
  lastVerified: number;
}

const DOWNLOADS_KEY = 'downloads-handle';

export async function storeDirectoryHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const payload: StoredHandleInfo = {
    handle,
    grantedAt: Date.now(),
    lastVerified: Date.now(),
  };
  await set(DOWNLOADS_KEY, payload, fsStore);
}

export async function getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const info = await get<StoredHandleInfo | undefined>(
      DOWNLOADS_KEY,
      fsStore,
    );
    return info?.handle ?? null;
  } catch (error) {
    console.error('[FileSystem] Failed to load stored directory handle', error);
    return null;
  }
}

export async function clearStoredHandle(): Promise<void> {
  await del(DOWNLOADS_KEY, fsStore);
}

export async function updateLastVerified(): Promise<void> {
  const info = await get<StoredHandleInfo | undefined>(DOWNLOADS_KEY, fsStore);
  if (!info) return;
  info.lastVerified = Date.now();
  await set(DOWNLOADS_KEY, info, fsStore);
}

export async function getHandleMetadata(): Promise<Pick<
  StoredHandleInfo,
  'grantedAt' | 'lastVerified'
> | null> {
  const info = await get<StoredHandleInfo | undefined>(DOWNLOADS_KEY, fsStore);
  if (!info) return null;
  return {
    grantedAt: info.grantedAt,
    lastVerified: info.lastVerified,
  };
}
