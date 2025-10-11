import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type DownloadsAccessResult,
  isHandleValid,
  ManagedSubfolderRequiredError,
  requestDownloadsAccess,
  verifyDirectoryPermission,
} from './directory-picker';
import * as handleStorage from './handle-storage';

// Mock handle-storage module
vi.mock('./handle-storage', () => ({
  normalizeRelativePath: vi.fn(
    (path: string) => path?.replace(/^\/+|\/+$/g, '') || '',
  ),
}));

const normalizeRelativePathMock = vi.mocked(handleStorage.normalizeRelativePath);

// Mock window global for browser APIs
if (typeof window === 'undefined') {
  (globalThis as { window?: unknown }).window = {} as Window &
    typeof globalThis;
}

function createDirectoryHandle(
  overrides: Partial<FileSystemDirectoryHandle> & {
    resolve?: FileSystemDirectoryHandle['resolve'];
    queryPermission?: FileSystemDirectoryHandle['queryPermission'];
    requestPermission?: FileSystemDirectoryHandle['requestPermission'];
  } = {},
): FileSystemDirectoryHandle {
  return {
    name: 'Downloads',
    kind: 'directory',
    queryPermission: vi.fn().mockResolvedValue('granted'),
    requestPermission: vi.fn().mockResolvedValue('granted'),
    resolve: vi.fn().mockResolvedValue(['Downloads']),
    ...overrides,
  } as unknown as FileSystemDirectoryHandle;
}

describe('directory-picker', () => {
  let mockDirectoryHandle: FileSystemDirectoryHandle;
  let mockShowDirectoryPicker: ReturnType<typeof vi.fn>;
  let consoleErrorStub: ReturnType<typeof vi.spyOn>;
  let consoleWarnStub: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    normalizeRelativePathMock.mockClear();
    consoleErrorStub = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnStub = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock directory handle with permission methods
    mockDirectoryHandle = createDirectoryHandle();

    // Mock showDirectoryPicker
    mockShowDirectoryPicker = vi.fn().mockResolvedValue(mockDirectoryHandle);
    (
      window as unknown as {
        showDirectoryPicker: typeof mockShowDirectoryPicker;
      }
    ).showDirectoryPicker = mockShowDirectoryPicker;

    // Setup normalizeRelativePath mock
    normalizeRelativePathMock.mockImplementation(
      (path: string | undefined) =>
        path
          ?.replace(/^\/+|\/+$/g, '')
          .replace(/\.+$/g, '')
          .trim() || '',
    );
  });

  afterEach(() => {
    consoleErrorStub.mockRestore();
    consoleWarnStub.mockRestore();
  });

  describe('requestDownloadsAccess', () => {
    it('successfully requests Downloads directory access', async () => {
      const result = await requestDownloadsAccess();

      expect(result).toEqual({
        handle: mockDirectoryHandle,
        managedRelativePath: 'Downloads',
        parentDirectoryName: 'Downloads',
        createdManagedFolder: false,
      } satisfies DownloadsAccessResult);

      expect(mockShowDirectoryPicker).toHaveBeenCalledWith({
        startIn: 'downloads',
        mode: 'readwrite',
        id: 'newname-downloads',
      });
    });

    it('throws error when File System Access API is not supported', async () => {
      // Remove showDirectoryPicker
      delete (window as { showDirectoryPicker?: unknown }).showDirectoryPicker;

      await expect(requestDownloadsAccess()).rejects.toThrow(
        'File System Access API is not supported in this context',
      );
    });

    it('throws error when user cancels directory picker', async () => {
      mockShowDirectoryPicker.mockRejectedValue(
        new DOMException('User cancelled', 'AbortError'),
      );

      await expect(requestDownloadsAccess()).rejects.toThrow(
        'User cancelled directory picker',
      );
    });

    it('throws ManagedSubfolderRequiredError for system directory errors', async () => {
      mockShowDirectoryPicker.mockRejectedValue(
        new DOMException(
          'This directory contains system files',
          'SecurityError',
        ),
      );

      await expect(requestDownloadsAccess()).rejects.toThrow(
        ManagedSubfolderRequiredError,
      );
      await expect(requestDownloadsAccess()).rejects.toThrow(
        'Select a subfolder inside Downloads',
      );
    });

    it('detects system directory error with "system folder" pattern', async () => {
      mockShowDirectoryPicker.mockRejectedValue(
        new DOMException('Cannot access system folder', 'SecurityError'),
      );

      await expect(requestDownloadsAccess()).rejects.toThrow(
        ManagedSubfolderRequiredError,
      );
    });

    it('detects system directory error with "root directory" pattern', async () => {
      mockShowDirectoryPicker.mockRejectedValue(
        new DOMException('Root directory access denied', 'SecurityError'),
      );

      await expect(requestDownloadsAccess()).rejects.toThrow(
        ManagedSubfolderRequiredError,
      );
    });

    it('detects system directory error with "top-level downloads" pattern', async () => {
      mockShowDirectoryPicker.mockRejectedValue(
        new DOMException('Top-level Downloads not allowed', 'SecurityError'),
      );

      await expect(requestDownloadsAccess()).rejects.toThrow(
        ManagedSubfolderRequiredError,
      );
    });

    it('handles non-system DOMException errors', async () => {
      mockShowDirectoryPicker.mockRejectedValue(
        new DOMException('Network error', 'NetworkError'),
      );

      await expect(requestDownloadsAccess()).rejects.toThrow('Network error');
    });

    it('handles non-DOMException errors', async () => {
      mockShowDirectoryPicker.mockRejectedValue(new Error('Unknown error'));

      await expect(requestDownloadsAccess()).rejects.toThrow('Unknown error');
    });

    it('handles nested folder selection', async () => {
      const nestedHandle = createDirectoryHandle({
        name: 'Organized',
        resolve: vi.fn().mockResolvedValue(['Downloads', 'Organized']),
      });

      mockShowDirectoryPicker.mockResolvedValue(nestedHandle);

      const result = await requestDownloadsAccess();

      expect(result.managedRelativePath).toBe('Downloads/Organized');
      expect(result.parentDirectoryName).toBe('Organized');
    });

    it('handles resolve() failure gracefully', async () => {
      const handleWithoutResolve = createDirectoryHandle({
        name: 'Organized',
        resolve: vi.fn().mockRejectedValue(new Error('Resolve not supported')),
      });

      mockShowDirectoryPicker.mockResolvedValue(handleWithoutResolve);

      // Should not throw, should fall back to handle.name
      const result = await requestDownloadsAccess();

      expect(result.managedRelativePath).toBe('Organized');
      expect(result.parentDirectoryName).toBe('Organized');
    });

    it('normalizes the selected folder name', async () => {
      const handleWithSlashes = createDirectoryHandle({
        name: '/Organized/',
        resolve: vi.fn().mockResolvedValue(['/Organized/']),
      });

      mockShowDirectoryPicker.mockResolvedValue(handleWithSlashes);

      const result = await requestDownloadsAccess();

      // normalizeRelativePath should strip slashes
      expect(handleStorage.normalizeRelativePath).toHaveBeenCalled();
    });

    it('stores error context in global for debugging', async () => {
      const error = new DOMException('Test error', 'SecurityError');
      mockShowDirectoryPicker.mockRejectedValue(error);

      try {
        await requestDownloadsAccess();
      } catch {
        // Expected to throw
      }

      const global = globalThis as typeof globalThis & {
        __newNameLastDirectoryPickerError?: { name: string; message: string };
      };

      expect(global.__newNameLastDirectoryPickerError).toEqual({
        name: 'SecurityError',
        message: 'Test error',
      });
    });
  });

  describe('verifyDirectoryPermission', () => {
    it('returns "granted" when permission is already granted', async () => {
      const handle = createDirectoryHandle({
        queryPermission: vi.fn().mockResolvedValue('granted'),
      });

      const result = await verifyDirectoryPermission(handle);

      expect(result).toBe('granted');
      expect(handle.queryPermission).toHaveBeenCalledWith({
        mode: 'readwrite',
      });
    });

    it('requests permission when query returns "prompt"', async () => {
      const handle = createDirectoryHandle({
        queryPermission: vi.fn().mockResolvedValue('prompt'),
        requestPermission: vi.fn().mockResolvedValue('granted'),
      });

      const result = await verifyDirectoryPermission(handle);

      expect(result).toBe('granted');
      expect(handle.requestPermission).toHaveBeenCalledWith({
        mode: 'readwrite',
      });
    });

    it('returns "denied" when permission is denied', async () => {
      const handle = createDirectoryHandle({
        queryPermission: vi.fn().mockResolvedValue('denied'),
        requestPermission: vi.fn().mockResolvedValue('denied'),
      });

      const result = await verifyDirectoryPermission(handle);

      expect(result).toBe('denied');
    });

    it('returns "denied" when queryPermission is not available', async () => {
      const handle = {} as FileSystemDirectoryHandle;

      const result = await verifyDirectoryPermission(handle);

      expect(result).toBe('denied');
    });

    it('returns current permission when requestPermission is not available', async () => {
      const handle = {
        queryPermission: vi.fn().mockResolvedValue('prompt'),
      } as unknown as FileSystemDirectoryHandle;

      const result = await verifyDirectoryPermission(handle);

      expect(result).toBe('prompt');
    });
  });

  describe('isHandleValid', () => {
    it('returns false for null handle', async () => {
      const result = await isHandleValid(null);

      expect(result).toBe(false);
    });

    it('returns true when permission is granted', async () => {
      const handle = createDirectoryHandle({
        queryPermission: vi.fn().mockResolvedValue('granted'),
      });

      const result = await isHandleValid(handle);

      expect(result).toBe(true);
    });

    it('requests permission when not granted', async () => {
      const handle = createDirectoryHandle({
        queryPermission: vi.fn().mockResolvedValue('prompt'),
        requestPermission: vi.fn().mockResolvedValue('granted'),
      });

      const result = await isHandleValid(handle);

      expect(result).toBe(true);
      expect(handle.requestPermission).toHaveBeenCalledWith({
        mode: 'readwrite',
      });
    });

    it('returns false when permission request is denied', async () => {
      const handle = createDirectoryHandle({
        queryPermission: vi.fn().mockResolvedValue('prompt'),
        requestPermission: vi.fn().mockResolvedValue('denied'),
      });

      const result = await isHandleValid(handle);

      expect(result).toBe(false);
    });

    it('returns false when queryPermission throws error', async () => {
      const handle = createDirectoryHandle({
        queryPermission: vi.fn().mockRejectedValue(new Error('Query failed')),
      });

      const result = await isHandleValid(handle);

      expect(result).toBe(false);
    });

    it('returns false when queryPermission is not available', async () => {
      const handle = {} as FileSystemDirectoryHandle;

      const result = await isHandleValid(handle);

      expect(result).toBe(false);
    });

    it('returns false when requestPermission is not available', async () => {
      const handle = {
        queryPermission: vi.fn().mockResolvedValue('prompt'),
      } as unknown as FileSystemDirectoryHandle;

      const result = await isHandleValid(handle);

      expect(result).toBe(false);
    });
  });

  describe('ManagedSubfolderRequiredError', () => {
    it('creates error with correct properties', () => {
      const error = new ManagedSubfolderRequiredError({
        name: 'SecurityError',
        message: 'Test error',
      });

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ManagedSubfolderRequiredError');
      expect(error.message).toBe('Select a subfolder inside Downloads');
      expect(error.details).toEqual({
        name: 'SecurityError',
        message: 'Test error',
      });
    });

    it('creates error without details', () => {
      const error = new ManagedSubfolderRequiredError();

      expect(error.message).toBe('Select a subfolder inside Downloads');
      expect(error.details).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('handles empty handle name', async () => {
      const emptyNameHandle = {
        ...mockDirectoryHandle,
        name: '',
        resolve: vi.fn().mockResolvedValue(['']),
      } as unknown as FileSystemDirectoryHandle;

      mockShowDirectoryPicker.mockResolvedValue(emptyNameHandle);

      const result = await requestDownloadsAccess();

      // Should handle empty name gracefully
      expect(result.parentDirectoryName).toBe('');
    });

    it('handles deeply nested folder structure', async () => {
      const deepHandle = {
        ...mockDirectoryHandle,
        name: 'Project',
        resolve: vi
          .fn()
          .mockResolvedValue(['Downloads', '2025', 'Finance', 'Project']),
      } as unknown as FileSystemDirectoryHandle;

      mockShowDirectoryPicker.mockResolvedValue(deepHandle);

      const result = await requestDownloadsAccess();

      expect(result.managedRelativePath).toBe('Downloads/2025/Finance/Project');
    });

    it('handles special characters in folder name', async () => {
      const specialHandle = {
        ...mockDirectoryHandle,
        name: 'Work [2025] - Q1',
        resolve: vi.fn().mockResolvedValue(['Work [2025] - Q1']),
      } as unknown as FileSystemDirectoryHandle;

      mockShowDirectoryPicker.mockResolvedValue(specialHandle);

      const result = await requestDownloadsAccess();

      expect(result.parentDirectoryName).toBe('Work [2025] - Q1');
    });
  });
});
