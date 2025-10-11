/**
 * Core file rename operations built on top of the File System Access API.
 *
 * Implements the copy+delete fallback until FileSystemHandle.move() ships for
 * non-OPFS files. Supports nested paths, streaming for large files, and Windows
 * reserved-name sanitisation.
 */
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { verifyDirectoryPermission } from './directory-picker';

export interface RenameOptions {
  /** Relative path to the existing file under the granted directory handle. */
  relativePath: string;
  /** Target filename (without directory) to apply. */
  newFilename: string;
  /** Root directory handle granted by the user (Downloads folder). */
  rootHandle: FileSystemDirectoryHandle;
  /** Maximum retry attempts for transient errors (default 3). */
  maxRetries?: number;
  /** Delay between retries in milliseconds (default 1000ms). */
  retryDelayMs?: number;
  /** Size threshold for switching to streaming copy (default 10MB). */
  streamThresholdBytes?: number;
}

export interface RenameResult {
  success: boolean;
  finalName: string;
  finalPath: string;
  error?: string;
  retriesUsed?: number;
  method?: 'copy-delete' | 'stream-delete';
}

// Windows reserved device names (case-insensitive)
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1_000;
const DEFAULT_STREAM_THRESHOLD = 10 * 1024 * 1024; // 10 MB

function sanitizeWindowsBasename(name: string): string {
  const lastDot = name.lastIndexOf('.');
  const basename = lastDot > 0 ? name.slice(0, lastDot) : name;
  const extension = lastDot > 0 ? name.slice(lastDot) : '';

  if (WINDOWS_RESERVED.test(basename)) {
    return `${basename}_${extension}`;
  }

  return name;
}

async function getParentAndLeaf(
  root: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<{ dir: FileSystemDirectoryHandle; leaf: string }> {
  const parts = relativePath.split('/').filter(Boolean);
  const leaf = parts.pop();

  if (!leaf) {
    throw new Error('Invalid path: empty leaf name');
  }

  let dir = root;
  for (const segment of parts) {
    dir = await dir.getDirectoryHandle(segment, { create: false });
  }

  return { dir, leaf };
}

async function resolveConflict(
  dirHandle: FileSystemDirectoryHandle,
  desiredName: string,
): Promise<string> {
  try {
    await dirHandle.getFileHandle(desiredName);
    // File exists; fall through to suffix logic.
  } catch {
    // Not found => desired name is available.
    return desiredName;
  }

  const lastDotIndex = desiredName.lastIndexOf('.');
  const basename =
    lastDotIndex > 0 ? desiredName.slice(0, lastDotIndex) : desiredName;
  const extension = lastDotIndex > 0 ? desiredName.slice(lastDotIndex) : '';

  for (let suffix = 2; suffix <= 100; suffix++) {
    const candidate = `${basename} - ${suffix}${extension}`;
    try {
      await dirHandle.getFileHandle(candidate);
    } catch {
      return candidate;
    }
  }

  return `${basename} - ${Date.now()}${extension}`;
}

/**
 * Rename a file located inside the granted directory handle.
 *
 * The operation copies the original file into a new handle and then deletes the
 * source entry because the File System Access API does not yet support moving
 * OPFS-external handles. For large files (larger than `streamThresholdBytes`,
 * default 10 MB) the copy is streamed to avoid buffering the entire payload in
 * memory.
 *
 * Retry behaviour:
 * - Transient DOMExceptions (`NoModificationAllowedError`, `NotAllowedError`,
 *   `InvalidModificationError`) trigger up to `maxRetries` attempts with
 *   `retryDelayMs` between tries (defaults: 3 retries, 1000 ms delay).
 * - The retry counter resets only after a successful rename; failures exit the
 *   loop early once the limit is hit.
 *
 * Errors:
 * - Permission loss before starting returns `{ success: false, error:
 *   'Permission denied for Downloads directory' }`.
 * - Exhausting retries returns `{ success: false }` with the most recent
 *   `DOMException.name` as the error message where available.
 * - The function never throws; it resolves with a `RenameResult` describing the
 *   outcome.
 *
 * Conflict resolution appends ` - <n>` (or a timestamp) when the destination
 * filename already exists.
 */
export async function renameFile({
  relativePath,
  newFilename,
  rootHandle,
  maxRetries = DEFAULT_MAX_RETRIES,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  streamThresholdBytes = DEFAULT_STREAM_THRESHOLD,
}: RenameOptions): Promise<RenameResult> {
  const permission = await verifyDirectoryPermission(rootHandle);
  if (permission !== 'granted') {
    return {
      success: false,
      finalName: newFilename,
      finalPath: relativePath,
      error: 'Permission denied for Downloads directory',
    };
  }

  const safeName = sanitizeWindowsBasename(newFilename);
  let retriesUsed = 0;
  let writable: FileSystemWritableFileStream | null = null;

  while (retriesUsed <= maxRetries) {
    try {
      const { dir: parentDir, leaf: oldLeaf } = await getParentAndLeaf(
        rootHandle,
        relativePath,
      );

      const oldHandle = await parentDir.getFileHandle(oldLeaf);
      const file = await oldHandle.getFile();

      const finalNewName = await resolveConflict(parentDir, safeName);
      const newHandle = await parentDir.getFileHandle(finalNewName, {
        create: true,
      });
      writable = await newHandle.createWritable();

      const useStreaming = file.size > streamThresholdBytes;
      if (useStreaming) {
        await file.stream().pipeTo(writable);
        writable = null; // stream().pipeTo closes the writable.
      } else {
        await writable.write(file);
        await writable.close();
        writable = null;
      }

      await parentDir.removeEntry(oldLeaf);

      const parentPath = relativePath.split('/').slice(0, -1).join('/');
      const finalPath = parentPath
        ? `${parentPath}/${finalNewName}`
        : finalNewName;

      if (debugLogger.isEnabled()) {
        debugLogger.log('[FileSystem] Rename successful', {
          old: relativePath,
          new: finalPath,
          retries: retriesUsed,
          method: useStreaming ? 'stream-delete' : 'copy-delete',
          fileSize: file.size,
        });
      }

      return {
        success: true,
        finalName: finalNewName,
        finalPath,
        retriesUsed,
        method: useStreaming ? 'stream-delete' : 'copy-delete',
      };
    } catch (error) {
      if (writable) {
        try {
          await writable.close();
        } catch {
          // Ignore close errors.
        }
        writable = null;
      }

      retriesUsed += 1;

      const domError = error instanceof DOMException ? error : null;
      const retryable =
        domError !== null &&
        (domError.name === 'NoModificationAllowedError' ||
          domError.name === 'NotAllowedError' ||
          domError.name === 'InvalidModificationError');

      if (retryable && retriesUsed <= maxRetries) {
        if (debugLogger.isEnabled()) {
          debugLogger.warn(
            `[FileSystem] Retryable error (${domError.name}); retry ${retriesUsed}/${maxRetries}`,
            relativePath,
          );
        }
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelayMs * retriesUsed),
        );
        continue;
      }

      return {
        success: false,
        finalName: newFilename,
        finalPath: relativePath,
        error: error instanceof Error ? error.message : String(error),
        retriesUsed,
      };
    }
  }

  return {
    success: false,
    finalName: newFilename,
    finalPath: relativePath,
    error: 'Max retries exceeded',
    retriesUsed,
  };
}

export function supportsNativeMove(): boolean {
  return 'move' in FileSystemHandle.prototype;
}

export async function renameFileNative(
  dirHandle: FileSystemDirectoryHandle,
  oldFilename: string,
  newFilename: string,
): Promise<RenameResult> {
  if (!supportsNativeMove()) {
    throw new Error('Native move() not supported');
  }

  try {
    const handle = await dirHandle.getFileHandle(oldFilename);
    const move = handle.move;
    if (typeof move !== 'function') {
      throw new Error('Native move() not available on handle');
    }
    await move.call(handle, newFilename);
    return {
      success: true,
      finalName: newFilename,
      finalPath: newFilename,
    };
  } catch (error) {
    return {
      success: false,
      finalName: oldFilename,
      finalPath: oldFilename,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
