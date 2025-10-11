/**
 * Directory picker and permission management for the File System Access API.
 */

export interface DirectoryHandleWithPermission {
  handle: FileSystemDirectoryHandle;
  permission: PermissionState;
}

type DirectoryPickerOptions = {
  startIn?: string;
  mode?: 'read' | 'readwrite';
};

function getPermissionFns(handle: FileSystemDirectoryHandle): {
  query?: (descriptor?: {
    mode?: 'read' | 'readwrite';
  }) => Promise<PermissionState>;
  request?: (descriptor?: {
    mode?: 'read' | 'readwrite';
  }) => Promise<PermissionState>;
} {
  const cast = handle as unknown as {
    queryPermission?: (descriptor?: {
      mode?: 'read' | 'readwrite';
    }) => Promise<PermissionState>;
    requestPermission?: (descriptor?: {
      mode?: 'read' | 'readwrite';
    }) => Promise<PermissionState>;
  };

  return {
    query: cast.queryPermission?.bind(handle),
    request: cast.requestPermission?.bind(handle),
  };
}

/**
 * Request read/write access to the Downloads directory.
 *
 * Must be triggered from a user gesture (e.g., button click).
 */
export class ManagedSubfolderRequiredError extends Error {
  constructor(
    public readonly details?: {
      name: string;
      message: string;
    },
  ) {
    super('Select a subfolder inside Downloads');
    this.name = 'ManagedSubfolderRequiredError';
  }
}

export async function requestDownloadsAccess(): Promise<FileSystemDirectoryHandle> {
  const picker = (
    window as typeof window & {
      showDirectoryPicker?: (
        options?: DirectoryPickerOptions,
      ) => Promise<FileSystemDirectoryHandle>;
    }
  ).showDirectoryPicker;

  if (typeof picker !== 'function') {
    throw new Error('File System Access API is not supported in this context');
  }

  try {
    const handle = await picker({
      startIn: 'downloads',
      mode: 'readwrite',
    });
    return handle;
  } catch (error) {
    if (error instanceof DOMException) {
      const context = { name: error.name, message: error.message };
      console.error('[DirectoryPicker] showDirectoryPicker failed', context);
      (
        globalThis as typeof globalThis & {
          __newNameLastDirectoryPickerError?: unknown;
        }
      ).__newNameLastDirectoryPickerError = context;
      if (error.name === 'AbortError') {
        throw new Error('User cancelled directory picker');
      }
      if (isSystemDirectoryError(error)) {
        throw new ManagedSubfolderRequiredError(context);
      }
      throw new Error(error.message || 'Failed to select directory');
    }
    console.error('[DirectoryPicker] Non-DOMException failure', error);
    throw error instanceof Error
      ? error
      : new Error('Failed to select directory');
  }
}

function isSystemDirectoryError(error: DOMException): boolean {
  const message = String(error.message || '').toLowerCase();
  if (!message) {
    return false;
  }
  return SYSTEM_DIRECTORY_PATTERNS.some((pattern) => pattern.test(message));
}

const SYSTEM_DIRECTORY_PATTERNS: readonly RegExp[] = [
  /contains system files/, // Chrome macOS wording for restricted roots
  /system folder/,
  /root directory/,
  /top[-\s]?level downloads/,
  /not allowed to open this folder/,
];

/**
 * Verify (and if necessary request) read/write permission for the given handle.
 */
export async function verifyDirectoryPermission(
  handle: FileSystemDirectoryHandle,
): Promise<PermissionState> {
  const { query, request } = getPermissionFns(handle);

  if (!query) {
    return 'denied';
  }

  const current = await query({ mode: 'readwrite' });
  if (current === 'granted') {
    return current;
  }

  if (!request) {
    return current;
  }

  const requested = await request({ mode: 'readwrite' });
  return requested;
}

/**
 * Determine whether the provided handle is still valid and has permission.
 */
export async function isHandleValid(
  handle: FileSystemDirectoryHandle | null,
): Promise<boolean> {
  if (!handle) return false;

  try {
    const { query, request } = getPermissionFns(handle);
    if (!query) {
      return false;
    }
    let permission = await query({ mode: 'readwrite' });
    if (permission === 'granted') {
      return true;
    }
    if (!request) {
      return false;
    }
    permission = await request({ mode: 'readwrite' });
    return permission === 'granted';
  } catch {
    return false;
  }
}
