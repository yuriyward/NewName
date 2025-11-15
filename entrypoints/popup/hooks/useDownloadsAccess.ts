import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { getStoredDirectoryHandle } from '@/entrypoints/shared/filesystem/handle-storage';
import { getOnboardingState } from '@/entrypoints/shared/onboarding/onboarding-state';

type PermissionStateDescriptor = {
  mode?: 'read' | 'readwrite';
};

type DirectoryHandleWithQuery = FileSystemDirectoryHandle & {
  queryPermission?: (
    descriptor?: PermissionStateDescriptor,
  ) => Promise<PermissionState>;
};

interface DirectoryAccessResult {
  permitted: boolean;
  isPersistent: boolean;
}

const READWRITE_DESCRIPTOR: PermissionStateDescriptor = { mode: 'readwrite' };

async function queryDirectoryPermission(
  handle: DirectoryHandleWithQuery,
): Promise<PermissionState | null> {
  const permissionFn = handle.queryPermission;
  if (typeof permissionFn !== 'function') {
    return null;
  }

  try {
    return await permissionFn.call(handle, READWRITE_DESCRIPTOR);
  } catch (error) {
    debugLogger.warn('[useDownloadsAccess] queryPermission failed', { error });
    return null;
  }
}

async function verifySessionDirectoryAccess(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  try {
    const iterator = handle.values();
    await iterator.next();
    debugLogger.log(
      '[useDownloadsAccess] Session-level directory permission detected after queryPermission denial',
    );
    return true;
  } catch (error) {
    debugLogger.warn(
      '[useDownloadsAccess] Directory access verification failed',
      {
        error,
      },
    );
    return false;
  }
}

async function evaluateDirectoryAccess(
  handle: FileSystemDirectoryHandle | null,
): Promise<DirectoryAccessResult> {
  if (!handle) {
    return { permitted: false, isPersistent: false };
  }

  try {
    const permission = await queryDirectoryPermission(
      handle as DirectoryHandleWithQuery,
    );
    if (permission === 'granted') {
      return { permitted: true, isPersistent: true };
    }

    if (permission === 'denied') {
      return { permitted: false, isPersistent: false };
    }
  } catch (error) {
    debugLogger.warn('Querying directory permission failed', { error });
  }

  const hasSessionAccess = await verifySessionDirectoryAccess(handle);
  return { permitted: hasSessionAccess, isPersistent: false };
}

interface UseDownloadsAccessResult {
  downloadsAccessChecked: boolean;
  hasDownloadsAccess: boolean | null;
  showOnboarding: boolean;
  accessCheckError: string | null;
  persistentAccessGranted: boolean;
  needsPersistentSetup: boolean;
  isRedirecting: boolean;
  openOnboarding: () => void;
  openPersistentSetup: () => Promise<void>;
  handleOnboardingComplete: () => void;
  handleOnboardingSkip: () => void;
}

export const useDownloadsAccess = (): UseDownloadsAccessResult => {
  const [downloadsAccessChecked, setDownloadsAccessChecked] = useState(false);
  const [hasDownloadsAccess, setHasDownloadsAccess] = useState<boolean | null>(
    null,
  );
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [accessCheckError, setAccessCheckError] = useState<string | null>(null);
  const [persistentAccessGranted, setPersistentAccessGranted] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [needsPersistentSetup, setNeedsPersistentSetup] = useState(false);

  const refreshDownloadsAccess = useCallback(async () => {
    setDownloadsAccessChecked(false);
    try {
      const [state, handle] = await Promise.all([
        getOnboardingState(),
        getStoredDirectoryHandle(),
      ]);
      const { permitted, isPersistent } = await evaluateDirectoryAccess(handle);
      setHasDownloadsAccess(permitted);
      setPersistentAccessGranted(isPersistent);
      // Only show onboarding if status is 'pending' (not completed or skipped)
      // Once completed, trust that the user has set up access even if permission check fails
      setShowOnboarding(!permitted && state.status === 'pending');
      setNeedsPersistentSetup(state.status === 'awaiting-persistent');
      setAccessCheckError(null);
    } catch (err) {
      debugLogger.error('Failed to evaluate onboarding state', { error: err });
      setAccessCheckError(
        err instanceof Error
          ? err.message
          : 'Unable to verify Downloads access.',
      );
      setHasDownloadsAccess(null);
      setShowOnboarding(false);
    } finally {
      setDownloadsAccessChecked(true);
    }
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    setHasDownloadsAccess(null);
    void refreshDownloadsAccess();
  }, [refreshDownloadsAccess]);

  const handleOnboardingSkip = useCallback(() => {
    setShowOnboarding(false);
    setHasDownloadsAccess(false);
    void refreshDownloadsAccess();
  }, [refreshDownloadsAccess]);

  const openOnboarding = useCallback(() => {
    setShowOnboarding(true);
  }, []);

  const openPersistentSetup = useCallback(async () => {
    try {
      setIsRedirecting(true);
      const url = browser.runtime.getURL('/downloads-permission.html');
      await browser.tabs.create({ url });
      // Note: Keep popup open so user can see what happened
    } catch (err) {
      debugLogger.error('[useDownloadsAccess] Failed to open setup page', {
        error: err,
      });
      setIsRedirecting(false);
    }
  }, []);

  useEffect(() => {
    void refreshDownloadsAccess();
  }, [refreshDownloadsAccess]);

  return {
    downloadsAccessChecked,
    hasDownloadsAccess,
    showOnboarding,
    accessCheckError,
    persistentAccessGranted,
    needsPersistentSetup,
    isRedirecting,
    openOnboarding,
    openPersistentSetup,
    handleOnboardingComplete,
    handleOnboardingSkip,
  };
};
