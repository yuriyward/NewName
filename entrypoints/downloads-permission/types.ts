/**
 * Type definitions for downloads permission page
 */

/**
 * State machine for the permission request flow
 */
export type RequestState =
  | { status: 'idle' }
  | { status: 'pending' }
  | {
      status: 'success';
      grantedAt: number;
      managedRelativePath: string;
      createdManagedFolder: boolean;
      parentDirectoryName: string;
    }
  | {
      status: 'step1-complete';
      managedRelativePath: string;
      parentDirectoryName: string;
    }
  | { status: 'error'; message: string; hint?: string };

/**
 * Result from a successful grant access operation
 */
export interface GrantAccessResult {
  handle: FileSystemDirectoryHandle;
  managedRelativePath: string;
  parentDirectoryName: string;
}

/**
 * Result from a successful restore operation
 */
export interface RestoreAccessResult {
  managedRelativePath: string;
  parentDirectoryName: string;
}
