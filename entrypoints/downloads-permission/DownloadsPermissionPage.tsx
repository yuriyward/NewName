/**
 * Full-page downloads folder permission onboarding interface
 * Designed to be friendly and easy to follow for non-technical users
 */

import FolderIcon from '@heroicons/react/24/outline/FolderIcon';
import FolderOpenIcon from '@heroicons/react/24/outline/FolderOpenIcon';
import HandRaisedIcon from '@heroicons/react/24/outline/HandRaisedIcon';
import CheckCircleIcon from '@heroicons/react/24/solid/CheckCircleIcon';
import { type JSX, useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  requestDownloadsAccess,
  verifyDirectoryPermission,
} from '@/entrypoints/shared/filesystem/directory-picker';
import {
  getManagedRelativePath,
  getStoredDirectoryHandle,
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
import { VideoDemo } from './VideoDemo';

// Video hosted on GitHub for step 1 of folder selection process
// Keep video external to avoid bloating extension size
// Using 4:3 cropped version for larger display in the UI
const FOLDER_SELECTION_VIDEO_URL =
  'https://raw.githubusercontent.com/yuriyward/github-public-media/main/videos/folder_access_setup_step_1_cropped_4x3.mp4';

type RequestState =
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

export function DownloadsPermissionPage(): JSX.Element {
  const [state, setState] = useState<RequestState>({ status: 'idle' });
  const [hasStoredHandle, setHasStoredHandle] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    'grant' | 'restore' | null
  >(null);
  const storedHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

  // Determine which step we're on (1 = pick folder, 2 = confirm permanent access)
  const currentStep = hasStoredHandle ? 2 : 1;

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
          {
            error: err,
          },
        );
        storedHandleRef.current = null;
        setHasStoredHandle(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Auto-close tab after successful setup
  // The 2500ms delay allows users to see the success message before the tab closes
  useEffect(() => {
    if (state.status !== 'success') return;
    const timeout = window.setTimeout(() => {
      window.close();
    }, 2500);
    return () => window.clearTimeout(timeout);
  }, [state]);

  async function handleGrantAccess(): Promise<void> {
    if (state.status === 'pending') {
      return;
    }
    setState({ status: 'pending' });
    setPendingAction('grant');
    try {
      const {
        handle,
        managedRelativePath,
        createdManagedFolder: _createdManagedFolder,
        parentDirectoryName,
      } = await requestDownloadsAccess();
      const permission = await verifyDirectoryPermission(handle);
      if (permission !== 'granted') {
        throw new Error('Permission not granted');
      }
      await storeDirectoryHandle(handle, { relativePath: managedRelativePath });
      await updateLastVerified();
      await markOnboardingAwaitingPersistent();
      storedHandleRef.current = handle;
      setHasStoredHandle(true);

      // Experimental: Close current page and reopen to see if Chrome shows persistent permission modal
      debugLogger.log(
        '[DownloadsPermissionPage] Closing and reopening setup page to trigger persistent permission',
      );

      // Open new setup page before closing current one
      const setupUrl = browser.runtime.getURL('/downloads-permission.html');
      const newTab = await browser.tabs.create({ url: setupUrl });

      // Close current setup page once new tab is successfully created
      // The new page will detect 'awaiting-persistent' status and auto-trigger requestPermission()
      if (newTab.id) {
        window.close();
      } else {
        // If tab creation didn't return an ID, show step1-complete state
        setState({
          status: 'step1-complete',
          managedRelativePath,
          parentDirectoryName,
        });
      }
    } catch (err) {
      const lastPickerError =
        (
          window as typeof window & {
            __newNameLastDirectoryPickerError?: unknown;
          }
        ).__newNameLastDirectoryPickerError ?? null;
      debugLogger.error('[DownloadsPermissionPage] Granting access failed', {
        error: err,
        lastPickerError,
      });
      const { message, hint } = classifyPermissionError(err, lastPickerError);
      setState({
        status: 'error',
        message,
        hint,
      });
    }
    setPendingAction(null);
  }

  async function handleRestoreExisting(): Promise<void> {
    if (state.status === 'pending') {
      return;
    }

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

      setHasStoredHandle(true);
      setState({
        status: 'success',
        grantedAt: Date.now(),
        managedRelativePath,
        createdManagedFolder: false,
        parentDirectoryName: handle.name,
      });

      // Navigate to AI mode selection (new users) or AI setup (existing users)
      void navigateAfterDownloadsSetup();
    } catch (err) {
      debugLogger.error(
        '[DownloadsPermissionPage] Restoring saved access failed',
        {
          error: err,
        },
      );
      const { message, hint } = classifyPermissionError(err, null);
      setState({
        status: 'error',
        message,
        hint,
      });
    } finally {
      setPendingAction(null);
    }
  }

  // Success state - show celebration screen
  if (state.status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-success-50 via-background to-background text-foreground">
        <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-6 px-6 py-10 text-center">
          <div className="relative">
            <div className="absolute -inset-4 animate-pulse rounded-full bg-success-200/50" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-success-500 text-white shadow-lg">
              <CheckCircleIcon className="h-12 w-12" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-success-700">All set! 🎉</h1>
            <p className="text-default-600">
              NewName can now organize your downloads.
            </p>
          </div>

          <p className="text-sm text-default-400">Closing...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50/40 via-background to-background text-foreground">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-6">
        {/* Main content card */}
        <div className="relative rounded-3xl border border-default-200 bg-white/80 p-6 shadow-xl backdrop-blur sm:p-8 lg:p-10">
          {/* Compact step indicator in top-right corner */}
          <div className="absolute right-4 top-4 flex items-center gap-1.5 sm:right-6 sm:top-6">
            {Array.from({ length: 2 }, (_, i) => {
              const stepNum = i + 1;
              const isCompleted = stepNum < currentStep;
              const isCurrent = stepNum === currentStep;

              return (
                <div
                  key={stepNum}
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-all ${isCompleted
                    ? 'bg-success-500 text-white'
                    : isCurrent
                      ? 'bg-primary text-white ring-2 ring-primary/20'
                      : 'bg-default-200 text-default-500'
                    }`}
                >
                  {isCompleted ? (
                    <CheckCircleIcon className="h-4 w-4" />
                  ) : (
                    stepNum
                  )}
                </div>
              );
            })}
          </div>
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

          {/* Error message */}
          {state.status === 'error' && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <span className="text-lg">💡</span>
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-amber-900">
                    {state.message}
                  </p>
                  {state.hint && (
                    <p className="text-sm text-amber-700">{state.hint}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 1 complete message */}
          {state.status === 'step1-complete' && (
            <div className="mb-4 rounded-2xl border border-success-200 bg-success-50 p-3.5">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-600">
                  <CheckCircleIcon className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-success-900">Step 1 done!</p>
                  <p className="text-sm text-success-700">
                    A new tab will open for step 2. If not, close this and click
                    the extension icon.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Large video demo */}
          {!hasStoredHandle && state.status !== 'step1-complete' && (
            <div className="mb-5 space-y-3">
              <VideoDemo
                src={FOLDER_SELECTION_VIDEO_URL}
                aspectRatio={4 / 3}
                ariaLabel="Video demonstration of folder selection process"
              />
              {/* Important tip about creating subfolder */}
              <div className="rounded-xl bg-primary-50/60 p-3 text-center">
                <p className="text-sm text-primary-800">
                  💡 Create a subfolder like{' '}
                  <strong>Downloads/Organized</strong> — you can't select main
                  system folders
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Video demo and instruction */}
          {hasStoredHandle && (
            <div className="mb-5 space-y-3">
              <VideoDemo
                src={FOLDER_SELECTION_VIDEO_URL}
                aspectRatio={4 / 3}
                ariaLabel="Video demonstration of folder selection process"
              />
              {/* Simple instruction */}
              <div className="rounded-xl bg-primary-50/60 p-3 text-center">
                <p className="text-sm text-primary-800">
                  Pick the same folder and click{' '}
                  <span className="whitespace-nowrap rounded bg-primary-100 px-1.5 py-0.5 font-medium text-primary-700">
                    Allow on every visit
                  </span>
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
                  onClick={() => {
                    void handleRestoreExisting();
                  }}
                  disabled={state.status === 'pending'}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white shadow-lg transition ${state.status === 'pending'
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
                  onClick={() => {
                    void handleGrantAccess();
                  }}
                  disabled={state.status === 'pending'}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl border border-default-300 bg-white px-6 py-3 text-sm font-medium text-default-600 transition ${state.status === 'pending'
                    ? 'cursor-not-allowed opacity-60'
                    : 'hover:bg-default-50'
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
                onClick={() => {
                  void handleGrantAccess();
                }}
                disabled={state.status === 'pending'}
                className={`flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white shadow-lg transition ${state.status === 'pending'
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
        {state.status === 'error' && (
          <details className="rounded-2xl border border-default-200 bg-default-50/50">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-default-600 hover:text-default-900">
              Need help?
            </summary>
            <div className="space-y-2 border-t border-default-200 px-4 py-3 text-sm text-default-600">
              <p className="font-medium">If Chrome blocked access:</p>
              <ol className="list-inside list-decimal space-y-1.5 text-default-500">
                <li>Click the padlock icon in the address bar</li>
                <li>Go to Site settings</li>
                <li>Set File system access to Allow</li>
                <li>Try again</li>
              </ol>
            </div>
          </details>
        )}

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
