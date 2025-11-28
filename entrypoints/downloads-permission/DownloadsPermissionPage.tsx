/**
 * Full-page downloads folder permission onboarding interface
 * Designed to be friendly and easy to follow for non-technical users
 */

import FolderIcon from '@heroicons/react/24/outline/FolderIcon';
import FolderOpenIcon from '@heroicons/react/24/outline/FolderOpenIcon';
import HandRaisedIcon from '@heroicons/react/24/outline/HandRaisedIcon';
import { useTheme } from '@heroui/use-theme';
import { type JSX, useEffect, useRef, useState } from 'react';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { getStoredDirectoryHandle } from '@/entrypoints/shared/filesystem/handle-storage';
import { getOnboardingState } from '@/entrypoints/shared/onboarding/onboarding-state';
import {
  getSettings,
  subscribeSettings,
} from '@/entrypoints/shared/settings/settings';
import { ThemeToggleButton } from '@/entrypoints/shared/ui/ThemeToggleButton';
import { getAppropriateTheme } from '@/entrypoints/shared/ui/theme-service';
import { ErrorMessage } from './components/ErrorMessage';
import { Step1CompleteMessage } from './components/Step1CompleteMessage';
import { StepIndicator } from './components/StepIndicator';
import { SuccessScreen } from './components/SuccessScreen';
import { TroubleshootingSection } from './components/TroubleshootingSection';
import {
  FOLDER_SELECTION_STEP1_VIDEO_URL,
  FOLDER_SELECTION_STEP2_VIDEO_URL,
  SUCCESS_AUTO_CLOSE_DELAY_MS,
} from './constants';
import {
  checkExistingPermission,
  grantDownloadsAccess,
  restoreExistingAccess,
} from './permission-handlers';
import type { RequestState } from './types';
import { VideoDemo } from './VideoDemo';

export function DownloadsPermissionPage(): JSX.Element {
  const { setTheme } = useTheme();
  const [state, setState] = useState<RequestState>({ status: 'idle' });
  const [hasStoredHandle, setHasStoredHandle] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    'grant' | 'restore' | null
  >(null);
  const storedHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

  // Determine which step we're on (1 = pick folder, 2 = confirm permanent access)
  const currentStep = hasStoredHandle ? 2 : 1;

  // Load stored handle on mount
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const handle = await getStoredDirectoryHandle();
        if (!active) return;
        storedHandleRef.current = handle;
        setHasStoredHandle(Boolean(handle));
      } catch (err) {
        if (!active) return;
        debugLogger.warn(
          '[DownloadsPermissionPage] Failed to load saved handle',
          { error: err },
        );
        storedHandleRef.current = null;
        setHasStoredHandle(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Load theme from settings and subscribe to changes
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    getSettings()
      .then((settings) => {
        if (!active) return;
        const appropriateTheme = getAppropriateTheme(settings.theme);
        setTheme(appropriateTheme);
      })
      .catch((err) => {
        debugLogger.error('[DownloadsPermission] Failed to load theme', {
          error: err,
        });
      });

    // Subscribe to settings changes (syncs theme with other contexts)
    unsubscribe = subscribeSettings((updatedSettings) => {
      if (!active) return;
      if (updatedSettings.theme) {
        setTheme(updatedSettings.theme);
      }
    });

    return () => {
      active = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [setTheme]);

  // Auto-close tab after successful setup
  useEffect(() => {
    if (state.status !== 'success') return;
    const timeout = window.setTimeout(() => {
      window.close();
    }, SUCCESS_AUTO_CLOSE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [state]);

  // Auto-check permission state when reopening after step 1
  useEffect(() => {
    if (!hasStoredHandle) return;
    if (state.status !== 'idle') return;

    let active = true;
    void (async () => {
      try {
        const onboardingState = await getOnboardingState();
        if (!active) return;

        if (onboardingState.status === 'awaiting-persistent') {
          debugLogger.log(
            '[DownloadsPermissionPage] Checking permission state for awaiting-persistent',
          );

          const handle = storedHandleRef.current;
          if (!handle) {
            setState({
              status: 'error',
              message: "We couldn't find your folder",
              hint: "Let's start fresh — click 'Start over' to pick a folder again.",
            });
            return;
          }

          const result = await checkExistingPermission(handle);
          if (result.granted && result.managedRelativePath) {
            setHasStoredHandle(true);
            setState({
              status: 'success',
              grantedAt: Date.now(),
              managedRelativePath: result.managedRelativePath,
              createdManagedFolder: false,
              parentDirectoryName: handle.name,
            });
          }
        }
      } catch (err) {
        if (!active) return;
        debugLogger.warn(
          '[DownloadsPermissionPage] Failed to check permission state',
          { error: err },
        );
      }
    })();

    return () => {
      active = false;
    };
  }, [hasStoredHandle, state.status]);

  async function handleGrantAccess(): Promise<void> {
    if (state.status === 'pending') return;
    setState({ status: 'pending' });
    setPendingAction('grant');

    const outcome = await grantDownloadsAccess();

    switch (outcome.type) {
      case 'tab-reopened':
        // Window will close, no state update needed
        break;
      case 'step1-complete':
        storedHandleRef.current = null; // Will be reloaded on new page
        setHasStoredHandle(true);
        setState({
          status: 'step1-complete',
          managedRelativePath: outcome.managedRelativePath,
          parentDirectoryName: outcome.parentDirectoryName,
        });
        break;
      case 'error':
        setState({
          status: 'error',
          message: outcome.message,
          hint: outcome.hint,
        });
        break;
    }
    setPendingAction(null);
  }

  async function handleRestoreExisting(): Promise<void> {
    if (state.status === 'pending') return;

    const handle = storedHandleRef.current;
    if (!handle) {
      setState({
        status: 'error',
        message: "We couldn't find your folder",
        hint: "Let's start fresh — click 'Start over' to pick a folder again.",
      });
      return;
    }

    setState({ status: 'pending' });
    setPendingAction('restore');

    const outcome = await restoreExistingAccess(handle);

    if (outcome.type === 'success') {
      setHasStoredHandle(true);
      setState({
        status: 'success',
        grantedAt: Date.now(),
        managedRelativePath: outcome.result.managedRelativePath,
        createdManagedFolder: false,
        parentDirectoryName: outcome.result.parentDirectoryName,
      });
    } else {
      setState({
        status: 'error',
        message: outcome.message,
        hint: outcome.hint,
      });
    }
    setPendingAction(null);
  }

  // Success state - show celebration screen
  if (state.status === 'success') {
    return <SuccessScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50/40 via-background to-background text-foreground dark:from-primary-950/20">
      {/* Theme toggle button - fixed to top-right */}
      <ThemeToggleButton className="fixed top-4 right-4 z-50" />

      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-6">
        {/* Main content card */}
        <div className="relative rounded-3xl border border-default-200 bg-content1 p-6 shadow-xl backdrop-blur dark:border-content3 sm:p-8 lg:p-10">
          <StepIndicator currentStep={currentStep} />

          {/* Header with icon */}
          <div className="mb-5 flex flex-col items-center gap-2.5 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
              {hasStoredHandle ? (
                <HandRaisedIcon className="h-6 w-6" />
              ) : (
                <FolderOpenIcon className="h-6 w-6" />
              )}
            </div>

            <h1 className="text-xl font-bold text-default-900">
              {hasStoredHandle
                ? 'Grant permanent access'
                : 'Where should downloads be organized?'}
            </h1>
          </div>

          {/* Status messages */}
          {state.status === 'error' && (
            <ErrorMessage message={state.message} hint={state.hint} />
          )}
          {state.status === 'step1-complete' && <Step1CompleteMessage />}

          {/* Step 1: Large video demo */}
          {!hasStoredHandle && state.status !== 'step1-complete' && (
            <div className="mb-5 space-y-3">
              <VideoDemo
                src={FOLDER_SELECTION_STEP1_VIDEO_URL}
                aspectRatio={4 / 3}
                ariaLabel="Video demonstration of folder selection process - step 1"
              />
              <div className="rounded-xl border border-default-200 bg-content2 p-3 text-center dark:border-content3">
                <p className="text-sm text-default-600 dark:text-foreground/80">
                  💡 Create a subfolder like{' '}
                  <strong className="text-foreground">
                    Downloads/Organized
                  </strong>{' '}
                  — you can't select main system folders
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Video demo and instruction */}
          {hasStoredHandle && (
            <div className="mb-5 space-y-3">
              <VideoDemo
                src={FOLDER_SELECTION_STEP2_VIDEO_URL}
                aspectRatio={4 / 3}
                ariaLabel="Video demonstration of folder selection process - step 2"
              />
              <div className="rounded-xl border border-default-200 bg-content2 p-3 text-center dark:border-content3">
                <p className="text-sm text-default-600 dark:text-foreground/80">
                  Click below, select the same folder, and choose{' '}
                  <span className="whitespace-nowrap rounded bg-primary-500 px-1.5 py-0.5 font-medium text-white">
                    Allow on every visit
                  </span>{' '}
                  to finish
                </p>
              </div>
            </div>
          )}

          {/* Main action buttons */}
          <div className="flex flex-col gap-3">
            {hasStoredHandle ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleRestoreExisting()}
                  disabled={state.status === 'pending'}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white shadow-lg transition ${
                    state.status === 'pending'
                      ? 'cursor-not-allowed opacity-60'
                      : 'hover:bg-primary-600 hover:shadow-xl'
                  }`}
                >
                  <FolderIcon className="h-5 w-5" />
                  {state.status === 'pending' && pendingAction === 'restore'
                    ? 'Opening...'
                    : 'Select folder & finish'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleGrantAccess()}
                  disabled={state.status === 'pending'}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl border border-default-300 bg-content1 px-6 py-3 text-sm font-medium text-default-600 transition dark:border-content3 ${
                    state.status === 'pending'
                      ? 'cursor-not-allowed opacity-60'
                      : 'hover:bg-content2'
                  }`}
                >
                  {state.status === 'pending' && pendingAction === 'grant'
                    ? 'Opening...'
                    : 'Use a different folder'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void handleGrantAccess()}
                disabled={state.status === 'pending'}
                className={`flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white shadow-lg transition ${
                  state.status === 'pending'
                    ? 'cursor-not-allowed opacity-60'
                    : 'hover:bg-primary-600 hover:shadow-xl'
                }`}
              >
                <FolderOpenIcon className="h-5 w-5" />
                {state.status === 'pending' && pendingAction === 'grant'
                  ? 'Opening...'
                  : 'Choose folder'}
              </button>
            )}
          </div>
        </div>

        {/* Troubleshooting section - only show on error */}
        {state.status === 'error' && <TroubleshootingSection />}
      </main>

      {/* Skip button - fixed to bottom-right of screen */}
      <button
        type="button"
        onClick={() => {
          try {
            window.close();
          } catch {
            // Ignore close failures when tab is opened manually.
          }
        }}
        className="fixed bottom-4 right-4 text-xs text-default-500 underline hover:text-default-700"
      >
        Skip for now
      </button>
    </div>
  );
}
