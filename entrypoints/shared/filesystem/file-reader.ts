/**
 * Utilities for reading files from the File System Access API.
 */
import { normalizeDownloadPath } from './path-helpers';

export interface ResolveFileHandleResult {
  success: true;
  fileHandle: FileSystemFileHandle;
  parentDir: FileSystemDirectoryHandle;
  filename: string;
}

export interface ResolveFileHandleError {
  success: false;
  error: string;
  errorType: 'not-found' | 'permission-denied' | 'invalid-path' | 'unknown';
}

export type ResolveFileHandleOutput =
  | ResolveFileHandleResult
  | ResolveFileHandleError;

/**
 * Resolve a file handle from a root directory and relative path.
 * Navigates through nested directories to locate the target file.
 *
 * @param rootHandle - Root directory handle (typically Downloads folder)
 * @param relativePath - Relative path to the file (may include subdirectories)
 * @param fallbackFilename - Filename to use if path doesn't contain one
 * @returns File handle result or error details
 *
 * @example
 * const result = await resolveFileHandle(rootHandle, 'subfolder/document.txt');
 * if (result.success) {
 *   const file = await result.fileHandle.getFile();
 * }
 */
export async function resolveFileHandle(
  rootHandle: FileSystemDirectoryHandle,
  relativePath: string,
  fallbackFilename?: string,
): Promise<ResolveFileHandleOutput> {
  try {
    const normalizedPath = normalizeDownloadPath(relativePath);
    const segments = normalizedPath
      .split('/')
      .filter((segment) => segment.length > 0);

    const leaf = segments.pop() ?? fallbackFilename;
    if (!leaf) {
      return {
        success: false,
        error: 'Missing filename in path',
        errorType: 'invalid-path',
      };
    }

    let dirHandle: FileSystemDirectoryHandle = rootHandle;
    for (const segment of segments) {
      try {
        dirHandle = await dirHandle.getDirectoryHandle(segment, {
          create: false,
        });
      } catch (error) {
        const message =
          error instanceof DOMException && error.name === 'NotFoundError'
            ? `Directory not found: ${segment}`
            : `Failed to access directory: ${segment}`;
        return {
          success: false,
          error: message,
          errorType:
            error instanceof DOMException && error.name === 'NotFoundError'
              ? 'not-found'
              : 'unknown',
        };
      }
    }

    try {
      const fileHandle = await dirHandle.getFileHandle(leaf, { create: false });
      return {
        success: true,
        fileHandle,
        parentDir: dirHandle,
        filename: leaf,
      };
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === 'NotFoundError'
          ? `File not found: ${leaf}`
          : `Unable to open file: ${leaf}`;
      return {
        success: false,
        error: message,
        errorType:
          error instanceof DOMException && error.name === 'NotFoundError'
            ? 'not-found'
            : 'unknown',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: 'unknown',
    };
  }
}

export interface ReadFileSliceResult {
  success: true;
  buffer: Uint8Array;
  fileSize: number;
  bytesRead: number;
  truncated: boolean;
}

export interface ReadFileSliceError {
  success: false;
  error: string;
}

export type ReadFileSliceOutput = ReadFileSliceResult | ReadFileSliceError;

/**
 * Read a slice of a file up to maxBytes.
 * Returns the buffer along with metadata about truncation.
 *
 * @param fileHandle - File handle to read from
 * @param maxBytes - Maximum number of bytes to read
 * @returns Buffer with file data or error
 *
 * @example
 * const result = await readFileSlice(fileHandle, 128 * 1024);
 * if (result.success) {
 *   console.log(`Read ${result.bytesRead} of ${result.fileSize} bytes`);
 * }
 */
export async function readFileSlice(
  fileHandle: FileSystemFileHandle,
  maxBytes: number,
): Promise<ReadFileSliceOutput> {
  try {
    const file = await fileHandle.getFile();
    const fileSize = file.size;

    if (fileSize === 0) {
      return {
        success: true,
        buffer: new Uint8Array(0),
        fileSize: 0,
        bytesRead: 0,
        truncated: false,
      };
    }

    const bytesToRead = Math.min(fileSize, maxBytes);
    const slice = await file.slice(0, bytesToRead).arrayBuffer();
    const buffer = new Uint8Array(slice);

    return {
      success: true,
      buffer,
      fileSize,
      bytesRead: buffer.byteLength,
      truncated: fileSize > maxBytes,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read file',
    };
  }
}
