/**
 * Permission handling logic for downloads folder access
 * Extracted from DownloadsPermissionPage to separate concerns
 */

import { browser } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  queryDirectoryPermission,
  requestDownloadsAccess,
  verifyDirectoryPermission,
} from '@/entrypoints/shared/filesystem/directory-picker';
import {
  getManagedRelativePath,
  storeDirectoryHandle,
  updateLastVerified,
} from '@/entrypoints/shared/filesystem/handle-storage';
import { classifyPermissionError } from '@/entrypoints/shared/filesystem/permission-errors';
import { navigateAfterDownloadsSetup } from '@/entrypoints/shared/onboarding/onboarding-navigation';
import {
  markOnboardingAwaitingPersistent,
  markOnboardingCompleted,
} from '@/entrypoints/shared/onboarding/onboarding-state';
import { clearBadge } from '@/entrypoints/shared/ui/badge-manager';
import type { GrantAccessResult, RestoreAccessResult } from './types';

/**
 * Wait for a newly created tab to be ready before proceeding
 */
async function waitForTabReady(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const checkTab = async () => {
      try {
        const tab = await browser.tabs.get(tabId);
        // Check if tab is complete (loaded) or at least has a valid status
        if (tab.status === 'complete' || tab.status === 'loading') {
          resolve();
        } else {
          // Check again after a short delay
          setTimeout(checkTab, 50);
        }
      } catch {
        // Tab might have been closed or doesn't exist, resolve anyway
        resolve();
      }
    };
    // Start checking immediately
    void checkTab();
  });
}

/**
 * Get the last directory picker error from the global window object
 */
function getLastPickerError(): unknown {
  return (
    (
      window as typeof window & {
        __newNameLastDirectoryPickerError?: unknown;
      }
    ).__newNameLastDirectoryPickerError ?? null
  );
}

/**
 * Result of the grant access operation
 */
export type GrantAccessOutcome =
  | { type: 'success'; result: GrantAccessResult }
  | {
      type: 'step1-complete';
      managedRelativePath: string;
      parentDirectoryName: string;
    }
  | { type: 'tab-reopened' }
  | { type: 'error'; message: string; hint?: string };

/**
 * Handle granting access to a new downloads folder
 * This is the main flow for step 1 of the permission process
 */
export async function grantDownloadsAccess(): Promise<GrantAccessOutcome> {
  try {
    const { handle, managedRelativePath, parentDirectoryName } =
      await requestDownloadsAccess();

    const permission = await verifyDirectoryPermission(handle);
    if (permission !== 'granted') {
      throw new Error('Permission not granted');
    }

    await storeDirectoryHandle(handle, { relativePath: managedRelativePath });
    await updateLastVerified();
    await markOnboardingAwaitingPersistent();

    // Experimental: Close current page and reopen to see if Chrome shows persistent permission modal
    debugLogger.log(
      '[permission-handlers] Closing and reopening setup page to trigger persistent permission',
    );

    // Open new setup page before closing current one
    const setupUrl = browser.runtime.getURL('/downloads-permission.html');
    const newTab = await browser.tabs.create({ url: setupUrl });

    // Close current setup page once new tab is visible and ready
    // The new page will detect 'awaiting-persistent' status and auto-trigger requestPermission()
    const newTabId = newTab.id;
    if (newTabId !== undefined) {
      // Wait for the new tab to be fully loaded/visible before closing current one
      // This prevents the jarring experience of closing before the new tab is ready
      await waitForTabReady(newTabId);
      window.close();
      return { type: 'tab-reopened' };
    }

    // If tab creation didn't return an ID, return step1-complete state
    return {
      type: 'step1-complete',
      managedRelativePath,
      parentDirectoryName,
    };
  } catch (err) {
    const lastPickerError = getLastPickerError();
    debugLogger.error('[permission-handlers] Granting access failed', {
      error: err,
      lastPickerError,
    });
    const { message, hint } = classifyPermissionError(err, lastPickerError);
    return { type: 'error', message, hint };
  }
}

/**
 * Result of the restore access operation
 */
export type RestoreAccessOutcome =
  | { type: 'success'; result: RestoreAccessResult }
  | { type: 'error'; message: string; hint?: string };

/**
 * Handle restoring access to a previously saved folder
 * This is the main flow for step 2 of the permission process
 */
export async function restoreExistingAccess(
  handle: FileSystemDirectoryHandle,
): Promise<RestoreAccessOutcome> {
  try {
    const permission = await verifyDirectoryPermission(handle);
    if (permission !== 'granted') {
      throw new Error('Permission not granted');
    }

    const managedRelativePath =
      (await getManagedRelativePath()) ?? handle.name ?? 'downloads';

    await updateLastVerified();
    await markOnboardingCompleted();

    // Clear badge since setup is complete
    await clearBadge();

    // Navigate to AI mode selection (new users) or AI setup (existing users)
    void navigateAfterDownloadsSetup();

    return {
      type: 'success',
      result: {
        managedRelativePath,
        parentDirectoryName: handle.name,
      },
    };
  } catch (err) {
    debugLogger.error('[permission-handlers] Restoring saved access failed', {
      error: err,
    });
    const { message, hint } = classifyPermissionError(err, null);
    return { type: 'error', message, hint };
  }
}

/**
 * Check if permission is already granted for a stored handle
 * Used when reopening the page after step 1
 */
export async function checkExistingPermission(
  handle: FileSystemDirectoryHandle,
): Promise<{ granted: boolean; managedRelativePath?: string }> {
  // SAFE: Only query permission, don't request (no user gesture needed)
  const permission = await queryDirectoryPermission(handle);

  if (permission === 'granted') {
    const managedRelativePath =
      (await getManagedRelativePath()) ?? handle.name ?? 'downloads';

    await updateLastVerified();
    await markOnboardingCompleted();
    await clearBadge();

    // Navigate to next onboarding step
    void navigateAfterDownloadsSetup();

    return { granted: true, managedRelativePath };
  }

  return { granted: false };
}
