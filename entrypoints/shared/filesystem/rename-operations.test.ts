import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as directoryPicker from './directory-picker';
import {
  type RenameOptions,
  type RenameResult,
  renameFile,
  renameFileNative,
  supportsNativeMove,
} from './rename-operations';

// Mock debug logger
vi.mock('@/entrypoints/shared/debug/logger', () => ({
  debugLogger: {
    log: vi.fn(),
    warn: vi.fn(),
    isEnabled: () => false,
  },
}));

// Mock FileSystemHandle global
if (typeof globalThis.FileSystemHandle === 'undefined') {
  (
    globalThis as { FileSystemHandle?: { prototype: Record<string, unknown> } }
  ).FileSystemHandle = {
    prototype: {},
  };
}

function createFileLike(
  overrides: Partial<File> & { name?: string; size?: number } = {},
): File {
  const fileLike = {
    name: 'old-file.pdf',
    size: 1024,
    type: 'application/pdf',
    lastModified: 0,
    stream: vi.fn(),
    arrayBuffer: vi.fn(),
    slice: vi.fn(),
    text: vi.fn(),
    ...overrides,
  };
  return fileLike as unknown as File;
}

const verifyDirectoryPermissionSpy = vi.spyOn(
  directoryPicker,
  'verifyDirectoryPermission',
);

describe('rename-operations', () => {
  const BASE_TIME = new Date('2025-01-01T00:00:00Z');
  let mockRootHandle: FileSystemDirectoryHandle;
  let mockParentDirHandle: FileSystemDirectoryHandle;
  let mockFileHandle: FileSystemFileHandle;
  let mockNewFileHandle: FileSystemFileHandle;
  let mockWritableStream: FileSystemWritableFileStream;
  let mockFile: File;

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    verifyDirectoryPermissionSpy.mockClear();
    verifyDirectoryPermissionSpy.mockResolvedValue('granted');
    vi.setSystemTime(BASE_TIME);

    // Mock file
    mockFile = createFileLike({ name: 'test.pdf' });

    // Mock writable stream
    mockWritableStream = {
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      abort: vi.fn().mockResolvedValue(undefined),
      seek: vi.fn(),
      truncate: vi.fn(),
    } as unknown as FileSystemWritableFileStream;

    // Mock file handles
    mockFileHandle = {
      getFile: vi.fn().mockResolvedValue(mockFile),
      name: 'old-file.pdf',
      kind: 'file',
    } as unknown as FileSystemFileHandle;

    mockNewFileHandle = {
      createWritable: vi.fn().mockResolvedValue(mockWritableStream),
      name: 'new-file.pdf',
      kind: 'file',
    } as unknown as FileSystemFileHandle;

    // Mock parent directory handle
    mockParentDirHandle = {
      getFileHandle: vi.fn((name: string, options?: { create?: boolean }) => {
        if (options?.create) {
          return Promise.resolve(mockNewFileHandle);
        }
        if (name === 'old-file.pdf') {
          return Promise.resolve(mockFileHandle);
        }
        // File not found (used for conflict checking)
        return Promise.reject(new DOMException('Not found', 'NotFoundError'));
      }),
      removeEntry: vi.fn().mockResolvedValue(undefined),
      name: 'parent',
      kind: 'directory',
    } as unknown as FileSystemDirectoryHandle;

    // Mock root handle - for simple paths without subdirectories
    mockRootHandle = {
      getDirectoryHandle: vi.fn().mockResolvedValue(mockParentDirHandle),
      getFileHandle: vi.fn((name: string, options?: { create?: boolean }) => {
        if (options?.create) {
          return Promise.resolve(mockNewFileHandle);
        }
        if (name === 'old-file.pdf') {
          return Promise.resolve(mockFileHandle);
        }
        return Promise.reject(new DOMException('Not found', 'NotFoundError'));
      }),
      removeEntry: vi.fn().mockResolvedValue(undefined),
      name: 'root',
      kind: 'directory',
      queryPermission: vi.fn().mockResolvedValue('granted'),
      requestPermission: vi.fn().mockResolvedValue('granted'),
    } as unknown as FileSystemDirectoryHandle;

  });

  describe('renameFile', () => {
    it('successfully renames a file using copy-delete method', async () => {
      const options: RenameOptions = {
        relativePath: 'old-file.pdf',
        newFilename: 'new-file.pdf',
        rootHandle: mockRootHandle,
      };

      const result = await renameFile(options);

      expect(result.success).toBe(true);
      expect(result.finalName).toBe('new-file.pdf');
      expect(result.finalPath).toBe('new-file.pdf');
      expect(result.method).toBe('copy-delete');
      expect(result.retriesUsed).toBe(0);

      // Verify the operations were called
      expect(mockFileHandle.getFile).toHaveBeenCalled();
      expect(mockNewFileHandle.createWritable).toHaveBeenCalled();
      expect(mockWritableStream.write).toHaveBeenCalledWith(mockFile);
      expect(mockWritableStream.close).toHaveBeenCalled();
      // For simple paths, root IS the parent directory
      expect(mockRootHandle.removeEntry).toHaveBeenCalledWith('old-file.pdf');
    });

    it('uses streaming for large files', async () => {
      // Create a large file (> 10MB) with correct size
      const largeSize = 11 * 1024 * 1024;
      const mockStream = {
        pipeTo: vi.fn().mockResolvedValue(undefined),
      };
      const largeFile = createFileLike({
        name: 'large.pdf',
        size: largeSize,
        stream: vi.fn().mockReturnValue(mockStream),
      });

      // Update mock to return large file
      const mockLargeFileHandle = {
        ...mockFileHandle,
        getFile: vi.fn().mockResolvedValue(largeFile),
      } as unknown as FileSystemFileHandle;

      vi.mocked(mockRootHandle.getFileHandle).mockImplementation(
        (name: string, options?: { create?: boolean }) => {
          if (options?.create) {
            return Promise.resolve(mockNewFileHandle);
          }
          if (name === 'large.pdf') {
            return Promise.resolve(mockLargeFileHandle);
          }
          return Promise.reject(new DOMException('Not found', 'NotFoundError'));
        },
      );

      const options: RenameOptions = {
        relativePath: 'large.pdf',
        newFilename: 'renamed-large.pdf',
        rootHandle: mockRootHandle,
      };

      const result = await renameFile(options);

      expect(result.success).toBe(true);
      expect(result.method).toBe('stream-delete');
      expect(mockStream.pipeTo).toHaveBeenCalledWith(mockWritableStream);
      expect(mockWritableStream.write).not.toHaveBeenCalled(); // Should use streaming, not write
    });

    it('handles nested paths correctly', async () => {
      const nestedDirHandle = {
        getFileHandle: vi.fn((name: string, options?: { create?: boolean }) => {
          if (options?.create) {
            return Promise.resolve(mockNewFileHandle);
          }
          if (name === 'nested-file.pdf') {
            return Promise.resolve(mockFileHandle);
          }
          return Promise.reject(new DOMException('Not found', 'NotFoundError'));
        }),
        removeEntry: vi.fn().mockResolvedValue(undefined),
        name: 'subfolder',
        kind: 'directory',
      } as unknown as FileSystemDirectoryHandle;

      vi.mocked(mockRootHandle.getDirectoryHandle).mockResolvedValue(
        nestedDirHandle,
      );

      const options: RenameOptions = {
        relativePath: 'subfolder/nested-file.pdf',
        newFilename: 'renamed-nested.pdf',
        rootHandle: mockRootHandle,
      };

      const result = await renameFile(options);

      expect(result.success).toBe(true);
      expect(result.finalPath).toBe('subfolder/renamed-nested.pdf');
      expect(mockRootHandle.getDirectoryHandle).toHaveBeenCalledWith(
        'subfolder',
        { create: false },
      );
    });

    it('sanitizes Windows reserved names', async () => {
      const options: RenameOptions = {
        relativePath: 'old-file.pdf',
        newFilename: 'CON.pdf', // Windows reserved name
        rootHandle: mockRootHandle,
      };

      const result = await renameFile(options);

      expect(result.success).toBe(true);
      expect(result.finalName).toBe('CON_.pdf'); // Should be sanitized
    });

    it('returns error when permission is denied', async () => {
      verifyDirectoryPermissionSpy.mockResolvedValue('denied');
      vi.mocked(mockRootHandle.queryPermission).mockResolvedValue('denied');
      vi.mocked(mockRootHandle.requestPermission).mockResolvedValue('denied');

      const options: RenameOptions = {
        relativePath: 'old-file.pdf',
        newFilename: 'new-file.pdf',
        rootHandle: mockRootHandle,
      };

      const result = await renameFile(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied for Downloads directory');
    });

    it('retries on retryable errors', async () => {
      let attemptCount = 0;
      vi.mocked(mockWritableStream.write).mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          return Promise.reject(
            new DOMException('File is busy', 'NoModificationAllowedError'),
          );
        }
        return Promise.resolve();
      });

      const options: RenameOptions = {
        relativePath: 'old-file.pdf',
        newFilename: 'new-file.pdf',
        rootHandle: mockRootHandle,
        maxRetries: 3,
        retryDelayMs: 0, // No real delay during tests
      };

      const resultPromise = renameFile(options);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.retriesUsed).toBe(1);
    });

    it('returns error after max retries exceeded', async () => {
      vi.mocked(mockWritableStream.write).mockRejectedValue(
        new DOMException('File is busy', 'NoModificationAllowedError'),
      );

      const options: RenameOptions = {
        relativePath: 'old-file.pdf',
        newFilename: 'new-file.pdf',
        rootHandle: mockRootHandle,
        maxRetries: 2,
        retryDelayMs: 0,
      };

      const resultPromise = renameFile(options);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('File is busy');
      expect(result.retriesUsed).toBeGreaterThan(0);
    });

    it('handles non-retryable errors immediately', async () => {
      vi.mocked(mockFileHandle.getFile).mockRejectedValue(
        new DOMException('Access denied', 'SecurityError'),
      );

      const options: RenameOptions = {
        relativePath: 'old-file.pdf',
        newFilename: 'new-file.pdf',
        rootHandle: mockRootHandle,
      };

      const result = await renameFile(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });

    it('resolves filename conflicts by adding suffix', async () => {
      // Simulate that 'new-file.pdf' already exists
      vi.mocked(mockRootHandle.getFileHandle).mockImplementation(
        (name: string, options?: { create?: boolean }) => {
          if (options?.create) {
            return Promise.resolve(mockNewFileHandle);
          }
          if (name === 'old-file.pdf' || name === 'new-file.pdf') {
            // Both files exist (simulate conflict)
            return Promise.resolve(mockFileHandle);
          }
          // 'new-file - 2.pdf' and other suffixes don't exist
          return Promise.reject(new DOMException('Not found', 'NotFoundError'));
        },
      );

      const options: RenameOptions = {
        relativePath: 'old-file.pdf',
        newFilename: 'new-file.pdf',
        rootHandle: mockRootHandle,
      };

      const result = await renameFile(options);

      expect(result.success).toBe(true);
      expect(result.finalName).toBe('new-file - 2.pdf'); // Should have suffix
    });

    it('closes writable stream on error to prevent leaks', async () => {
      vi.mocked(mockWritableStream.write).mockRejectedValue(
        new Error('Write failed'),
      );

      const options: RenameOptions = {
        relativePath: 'old-file.pdf',
        newFilename: 'new-file.pdf',
        rootHandle: mockRootHandle,
        maxRetries: 0, // No retries
      };

      const result = await renameFile(options);

      expect(result.success).toBe(false);
      expect(mockWritableStream.close).toHaveBeenCalled(); // Should close on error
    });

    it('handles empty leaf name error', async () => {
      const options: RenameOptions = {
        relativePath: '', // Completely empty path
        newFilename: 'new-file.pdf',
        rootHandle: mockRootHandle,
      };

      const result = await renameFile(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty leaf name');
    });
  });

  describe('supportsNativeMove', () => {
    it('returns true if move() is available in FileSystemHandle prototype', () => {
      // Save original prototype
      const originalProto = FileSystemHandle.prototype;

      // Mock move() method
      Object.defineProperty(FileSystemHandle.prototype, 'move', {
        value: vi.fn(),
        configurable: true,
      });

      expect(supportsNativeMove()).toBe(true);

      // Restore original prototype
      Object.defineProperty(FileSystemHandle.prototype, 'move', {
        value: undefined,
        configurable: true,
      });
    });

    it('returns false if move() is not available', () => {
      // Ensure move property is explicitly deleted
      delete (FileSystemHandle.prototype as { move?: unknown }).move;

      expect(supportsNativeMove()).toBe(false);
    });
  });

  describe('renameFileNative', () => {
    it('throws error if native move is not supported', async () => {
      // Ensure move is not defined
      delete (FileSystemHandle.prototype as { move?: unknown }).move;

      await expect(
        renameFileNative(mockParentDirHandle, 'old.pdf', 'new.pdf'),
      ).rejects.toThrow('Native move() not supported');
    });

    it('uses native move() when available', async () => {
      // Mock move() method
      const mockMove = vi.fn().mockResolvedValue(undefined);
      const mockHandleWithMove = {
        ...mockFileHandle,
        move: mockMove,
      } as unknown as FileSystemFileHandle;

      vi.mocked(mockParentDirHandle.getFileHandle).mockResolvedValue(
        mockHandleWithMove,
      );

      // Mock supportsNativeMove
      Object.defineProperty(FileSystemHandle.prototype, 'move', {
        value: vi.fn(),
        configurable: true,
      });

      const result = await renameFileNative(
        mockParentDirHandle,
        'old.pdf',
        'new.pdf',
      );

      expect(result.success).toBe(true);
      expect(result.finalName).toBe('new.pdf');
      expect(mockMove).toHaveBeenCalledWith('new.pdf');

      // Cleanup
      Object.defineProperty(FileSystemHandle.prototype, 'move', {
        value: undefined,
        configurable: true,
      });
    });

    it('returns error result on native move failure', async () => {
      const mockMove = vi.fn().mockRejectedValue(new Error('Move failed'));
      const mockHandleWithMove = {
        ...mockFileHandle,
        move: mockMove,
      } as unknown as FileSystemFileHandle;

      vi.mocked(mockParentDirHandle.getFileHandle).mockResolvedValue(
        mockHandleWithMove,
      );

      // Mock supportsNativeMove
      Object.defineProperty(FileSystemHandle.prototype, 'move', {
        value: vi.fn(),
        configurable: true,
      });

      const result = await renameFileNative(
        mockParentDirHandle,
        'old.pdf',
        'new.pdf',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Move failed');

      // Cleanup
      Object.defineProperty(FileSystemHandle.prototype, 'move', {
        value: undefined,
        configurable: true,
      });
    });
  });

  describe('Windows reserved name sanitization', () => {
    const reservedNames = [
      'CON',
      'PRN',
      'AUX',
      'NUL',
      'COM1',
      'COM9',
      'LPT1',
      'LPT9',
    ];

    for (const reserved of reservedNames) {
      it(`sanitizes ${reserved}.pdf to ${reserved}_.pdf`, async () => {
        const options: RenameOptions = {
          relativePath: 'old-file.pdf',
          newFilename: `${reserved}.pdf`,
          rootHandle: mockRootHandle,
        };

        const result = await renameFile(options);

        expect(result.success).toBe(true);
        expect(result.finalName).toBe(`${reserved}_.pdf`);
      });

      it(`sanitizes ${reserved.toLowerCase()}.txt (case insensitive)`, async () => {
        const options: RenameOptions = {
          relativePath: 'old-file.pdf',
          newFilename: `${reserved.toLowerCase()}.txt`,
          rootHandle: mockRootHandle,
        };

        const result = await renameFile(options);

        expect(result.success).toBe(true);
        expect(result.finalName).toBe(`${reserved.toLowerCase()}_.txt`);
      });
    }
  });

  describe('conflict resolution', () => {
    it('generates suffix up to 100 attempts', async () => {
      // Simulate all names up to " - 99" are taken
      const existingFiles = new Set<string>();
      existingFiles.add('test.pdf');
      for (let i = 2; i <= 99; i++) {
        existingFiles.add(`test - ${i}.pdf`);
      }

      vi.mocked(mockRootHandle.getFileHandle).mockImplementation(
        (name: string, options?: { create?: boolean }) => {
          if (options?.create) {
            return Promise.resolve(mockNewFileHandle);
          }
          if (name === 'old-file.pdf') {
            return Promise.resolve(mockFileHandle);
          }
          if (existingFiles.has(name)) {
            return Promise.resolve(mockNewFileHandle); // File exists
          }
          return Promise.reject(new DOMException('Not found', 'NotFoundError'));
        },
      );

      const options: RenameOptions = {
        relativePath: 'old-file.pdf',
        newFilename: 'test.pdf',
        rootHandle: mockRootHandle,
      };

      const result = await renameFile(options);

      expect(result.success).toBe(true);
      expect(result.finalName).toBe('test - 100.pdf');
    });
  });
});
