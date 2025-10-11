/**
 * Shared types for File System Access operations and state.
 */

export interface FileSystemState {
  hasPermission: boolean;
  handle: FileSystemDirectoryHandle | null;
  lastError?: string;
}

export interface RenameRequest {
  historyId: string;
  oldPath: string;
  newFilename: string;
  source: 'user-action' | 'auto-apply' | 'upgrade';
}

export interface RenameResponse {
  success: boolean;
  historyId: string;
  finalPath: string;
  error?: string;
}
