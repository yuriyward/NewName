/**
 * Persist and retrieve File System Access handles using IndexedDB.
 *
 * File system handles are structured-clone serialisable and must live in
 * IndexedDB (not chrome.storage.local) so that they can be restored in
 * offscreen documents and service workers.
 */
import { createStore, del, get, set } from 'idb-keyval';
import { debugLogger } from '@/entrypoints/shared/debug/logger';

const STORE_NAME = 'newname-filesystem';
const STORE_OBJECT_STORE = 'handles';

const fsStore = createStore(STORE_NAME, STORE_OBJECT_STORE);

export interface StoredHandleInfo {
  handle: FileSystemDirectoryHandle;
  grantedAt: number;
  lastVerified: number;
  managedRelativePath?: string;
}

const DOWNLOADS_KEY = 'downloads-handle';

export async function storeDirectoryHandle(
  handle: FileSystemDirectoryHandle,
  options: { relativePath?: string } = {},
): Promise<void> {
  const payload: StoredHandleInfo = {
    handle,
    grantedAt: Date.now(),
    lastVerified: Date.now(),
    managedRelativePath: normalizeRelativePath(
      options.relativePath ?? handle.name,
    ),
  };
  await set(DOWNLOADS_KEY, payload, fsStore);
}

export async function getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const info = await getStoredHandleInfo();
    return info?.handle ?? null;
  } catch (error) {
    debugLogger.error('[FileSystem] Failed to load stored directory handle', {
      error,
    });
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

export async function getManagedRelativePath(): Promise<string | null> {
  const info = await getStoredHandleInfo();
  if (!info) {
    return null;
  }
  const relativePath = normalizeRelativePath(
    info.managedRelativePath ?? info.handle?.name ?? '',
  );
  if (relativePath && relativePath !== info.managedRelativePath) {
    await set(
      DOWNLOADS_KEY,
      {
        ...info,
        managedRelativePath: relativePath,
      },
      fsStore,
    ).catch((error) => {
      debugLogger.warn(
        '[FileSystem] Failed to update managed path metadata',
        error,
      );
    });
  }
  return relativePath || null;
}

export function normalizeRelativePath(value: string | undefined): string {
  if (!value) return '';
  const forward = value.replace(/\\/g, '/');
  return forward
    .replace(/^\/+|\/+$/g, '')
    .replace(/\.+$/g, '')
    .trim();
}

async function getStoredHandleInfo(): Promise<StoredHandleInfo | null> {
  try {
    const info = await get<StoredHandleInfo | undefined>(
      DOWNLOADS_KEY,
      fsStore,
    );
    if (!info) {
      return null;
    }
    return info;
  } catch (error) {
    debugLogger.error('[FileSystem] Failed to read handle info', { error });
    return null;
  }
}
