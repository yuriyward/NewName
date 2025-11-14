import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { getStoredDirectoryHandle } from '@/entrypoints/shared/filesystem/handle-storage';
import { getOnboardingState } from '@/entrypoints/shared/onboarding/onboarding-state';

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
      let permitted = false;
      let isPersistent = false;
      if (handle) {
        try {
          // First try queryPermission
          const permissionFn = (
            handle as unknown as {
              queryPermission?: (descriptor?: {
                mode?: 'read' | 'readwrite';
              }) => Promise<PermissionState>;
            }
          ).queryPermission;
          if (typeof permissionFn === 'function') {
            const permission = await permissionFn.call(handle, {
              mode: 'readwrite',
            });
            permitted = permission === 'granted';
            isPersistent = permission === 'granted'; // 'granted' means persistent
          }

          // If queryPermission says 'prompt' or fails, try actually accessing the handle
          // This helps detect session permissions that queryPermission might miss
          if (!permitted) {
            try {
              // Attempt to iterate the directory - this will fail if permission is truly denied
              const iterator = handle.values();
              await iterator.next();
              // If we got here without throwing, we have access (at least session-level)
              permitted = true;
              isPersistent = false; // We only got here because queryPermission didn't return 'granted'
              debugLogger.log(
                '[useDownloadsAccess] queryPermission returned denied/prompt but handle is accessible (session permission)',
              );
            } catch (accessErr) {
              // Access truly denied
              debugLogger.warn(
                '[useDownloadsAccess] Directory access verification failed',
                { error: accessErr },
              );
              permitted = false;
            }
          }
        } catch (err) {
          debugLogger.warn('Querying directory permission failed', {
            error: err,
          });
          permitted = false;
        }
      }
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
