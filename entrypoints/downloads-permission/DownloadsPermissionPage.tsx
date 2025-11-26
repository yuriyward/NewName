/**
 * Full-page downloads folder permission onboarding interface
 */
import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import ShieldExclamationIcon from '@heroicons/react/24/outline/ShieldExclamationIcon';
import { type JSX, useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  ManagedSubfolderRequiredError,
  requestDownloadsAccess,
  verifyDirectoryPermission,
} from '@/entrypoints/shared/filesystem/directory-picker';
import {
  getManagedRelativePath,
  getStoredDirectoryHandle,
  storeDirectoryHandle,
  updateLastVerified,
} from '@/entrypoints/shared/filesystem/handle-storage';
import { navigateAfterDownloadsSetup } from '@/entrypoints/shared/onboarding/onboarding-navigation';
import {
  markOnboardingAwaitingPersistent,
  markOnboardingCompleted,
} from '@/entrypoints/shared/onboarding/onboarding-state';
import { clearBadge } from '@/entrypoints/shared/ui/badge-manager';

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

function classifyPermissionError(
  err: unknown,
  lastPickerError: unknown,
): { message: string; hint?: string } {
  if (err instanceof ManagedSubfolderRequiredError) {
    return {
      message: 'Pick a regular folder to continue.',
      hint: 'Chrome keeps system folders read-only. Create or choose a folder inside it (for example “Organized”) and select that instead.',
    };
  }

  const message = err instanceof Error ? err.message : 'Something went wrong';

  if (message === 'User cancelled directory picker') {
    if (lastPickerError && typeof lastPickerError === 'object') {
      const { name, message: detailMessage } = lastPickerError as {
        name?: string;
        message?: string;
      };

      if (
        name === 'AbortError' ||
        (detailMessage &&
          /Failed to execute 'showDirectoryPicker'/.test(detailMessage))
      ) {
        return {
          message: 'Chrome blocked that folder.',
          hint: 'Create a subfolder inside it or choose a different folder, then try again.',
        };
      }

      return {
        message: 'No folder selected. Please choose one to continue.',
        hint:
          detailMessage && name
            ? `Chrome said: “${detailMessage}” (code: ${name}).`
            : undefined,
      };
    }

    return {
      message: 'No folder selected. Please choose one to continue.',
    };
  }

  if (message === 'Permission not granted') {
    return {
      message: 'Please allow access so NewName can manage your files.',
      hint: 'When Chrome asks for permission, click “Allow”.',
    };
  }

  return {
    message: 'Something went wrong. Try again.',
    hint:
      message && message !== 'Something went wrong'
        ? `Chrome said: “${message}”.`
        : undefined,
  };
}

export function DownloadsPermissionPage(): JSX.Element {
  const [state, setState] = useState<RequestState>({ status: 'idle' });
  const [hasStoredHandle, setHasStoredHandle] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    'grant' | 'restore' | null
  >(null);
  const storedHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

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
        message: 'No saved folder found. Pick a folder first.',
        hint: 'Choose a folder with “Grant access” and then allow “Allow on every visit” in Chrome.',
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-10">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-default-400">
            NewName Setup
          </p>
          <h1 className="text-2xl font-semibold">
            {hasStoredHandle
              ? 'Step 2: Grant permanent access'
              : 'Choose your folder'}
          </h1>
          <p className="text-sm leading-relaxed text-default-500">
            {hasStoredHandle ? (
              <>
                Click the button below and select the same folder again. This
                time, choose <strong>&quot;Allow on every visit&quot;</strong>{' '}
                so you never have to do this again.
              </>
            ) : (
              <>
                We&apos;ll ask you to select your folder twice — once for
                initial access, then again for permanent access.
              </>
            )}
          </p>
          {!hasStoredHandle ? (
            <div className="rounded-lg bg-primary-50/50 border border-primary-200 px-4 py-3 text-sm text-default-600">
              <p className="font-medium text-primary-900 mb-1">
                💡 Recommended: Create a subfolder in Downloads
              </p>
              <p className="text-xs text-default-600">
                For easy organization, create a new folder like{' '}
                <strong>Downloads/Organized</strong> or{' '}
                <strong>Downloads/Web Downloads</strong>. You can create it
                right in the picker!
              </p>
            </div>
          ) : null}
        </header>

        {state.status === 'step1-complete' ? (
          <div className="rounded-2xl border border-success-200 bg-success-50/80 p-5 shadow-sm">
            <div className="flex flex-wrap items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success-100 text-success-700">
                <CheckCircleIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1 space-y-2 text-sm text-success-800">
                <p className="font-semibold">Page should have reopened</p>
                <p className="text-xs text-success-600">
                  A new tab should open automatically for step 2. If not, close
                  this tab and open the extension again.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {state.status === 'success' ? (
          <div className="rounded-2xl border border-success-200 bg-success-50/80 p-5 shadow-sm">
            <div className="flex flex-wrap items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success-100 text-success-700">
                <CheckCircleIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1 space-y-2 text-sm text-success-800">
                <p className="font-semibold">Setup complete!</p>
                <p className="text-xs text-success-600">
                  You&apos;re all set. This tab will close automatically.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {state.status === 'error' ? (
          <div className="rounded-2xl border border-warning-200 bg-warning-50/80 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-warning-100 text-warning-700">
                <ShieldExclamationIcon className="h-5 w-5" />
              </span>
              <div className="space-y-1 text-sm text-warning-800">
                <p className="font-semibold">{state.message}</p>
                {state.hint ? (
                  <p className="text-xs text-warning-700">{state.hint}</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {!hasStoredHandle ? (
          <section className="space-y-3 rounded-lg border border-default-200 bg-default-50/40 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-default-500">
              What to expect
            </h2>
            <ol className="space-y-2 text-sm leading-relaxed text-default-600">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">1.</span>
                <span>Choose your folder from the picker</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">2.</span>
                <span>
                  Page will reopen — choose the <strong>same folder</strong>{' '}
                  again
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">3.</span>
                <span>
                  Click <strong>&quot;Allow on every visit&quot;</strong> —
                  Done!
                </span>
              </li>
            </ol>
          </section>
        ) : null}

        {state.status === 'error' ? (
          <section className="space-y-3 rounded-lg border border-default-200 bg-default-50/80 p-4 text-xs text-default-600">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-default-500">
              Blocked the prompt?
            </h2>
            <ol className="space-y-2 leading-relaxed">
              <li>
                Click the padlock icon in Chrome&apos;s address bar and choose
                “Site settings”.
              </li>
              <li>
                Set “File system access” (or “Additional permissions → Folder
                access”) to “Allow”, then close the tab that opened.
              </li>
              <li>
                Return here, reload the page, and press “Grant access” again.
              </li>
              <li>
                If you still can&apos;t find the toggle, open
                chrome://settings/content/fileSystemWrite and allow NewName.
              </li>
            </ol>
          </section>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {hasStoredHandle ? (
            <>
              <button
                type="button"
                onClick={() => {
                  void handleRestoreExisting();
                }}
                disabled={
                  state.status === 'pending' || state.status === 'success'
                }
                className={`inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition ${
                  state.status === 'pending' || state.status === 'success'
                    ? 'cursor-not-allowed opacity-60'
                    : 'hover:opacity-90'
                }`}
              >
                {state.status === 'pending' && pendingAction === 'restore'
                  ? 'Opening…'
                  : 'Choose folder again'}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleGrantAccess();
                }}
                disabled={
                  state.status === 'pending' || state.status === 'success'
                }
                className={`inline-flex items-center justify-center rounded-md border border-default-300 px-4 py-2 text-sm font-semibold text-default-600 transition ${
                  state.status === 'pending' || state.status === 'success'
                    ? 'cursor-not-allowed opacity-60'
                    : 'hover:bg-default-100'
                }`}
              >
                {state.status === 'pending' && pendingAction === 'grant'
                  ? 'Opening…'
                  : 'Start over'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                void handleGrantAccess();
              }}
              disabled={
                state.status === 'pending' || state.status === 'success'
              }
              className={`inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition ${
                state.status === 'pending' || state.status === 'success'
                  ? 'cursor-not-allowed opacity-60'
                  : 'hover:opacity-90'
              }`}
            >
              {state.status === 'pending' && pendingAction === 'grant'
                ? 'Opening…'
                : 'Choose folder'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              try {
                window.close();
              } catch {
                // Ignore close failures when tab is opened manually.
              }
            }}
            className="inline-flex items-center justify-center rounded-md border border-default-300 px-4 py-2 text-sm font-semibold text-default-600 transition hover:bg-default-100"
          >
            Close tab
          </button>
        </div>

        <footer className="mt-auto space-y-1 text-xs text-default-400">
          <p>Having trouble? Make sure you&apos;re on Chrome 122 or later.</p>
          <p>
            If the picker keeps failing, report the error code shown above so we
            can investigate.
          </p>
        </footer>
      </main>
    </div>
  );
}
