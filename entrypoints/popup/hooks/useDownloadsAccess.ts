import { useCallback, useEffect, useState } from 'react';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { getStoredDirectoryHandle } from '@/entrypoints/shared/filesystem/handle-storage';
import { getOnboardingState } from '@/entrypoints/shared/onboarding/onboarding-state';

interface UseDownloadsAccessResult {
  downloadsAccessChecked: boolean;
  hasDownloadsAccess: boolean | null;
  showOnboarding: boolean;
  accessCheckError: string | null;
  openOnboarding: () => void;
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

  const refreshDownloadsAccess = useCallback(async () => {
    setDownloadsAccessChecked(false);
    try {
      const [state, handle] = await Promise.all([
        getOnboardingState(),
        getStoredDirectoryHandle(),
      ]);
      let permitted = false;
      if (handle) {
        try {
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
          } else {
            permitted = false;
          }
        } catch (err) {
          debugLogger.warn('Querying directory permission failed', {
            error: err,
          });
          permitted = false;
        }
      }
      setHasDownloadsAccess(permitted);
      setShowOnboarding(!permitted && state.status !== 'skipped');
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

  useEffect(() => {
    void refreshDownloadsAccess();
  }, [refreshDownloadsAccess]);

  return {
    downloadsAccessChecked,
    hasDownloadsAccess,
    showOnboarding,
    accessCheckError,
    openOnboarding,
    handleOnboardingComplete,
    handleOnboardingSkip,
  };
};
