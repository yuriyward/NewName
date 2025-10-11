import {
  CheckCircleIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import { type JSX, useEffect, useState } from 'react';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  ManagedSubfolderRequiredError,
  requestDownloadsAccess,
  verifyDirectoryPermission,
} from '@/entrypoints/shared/filesystem/directory-picker';
import {
  storeDirectoryHandle,
  updateLastVerified,
} from '@/entrypoints/shared/filesystem/handle-storage';
import { markOnboardingCompleted } from '@/entrypoints/shared/onboarding/onboarding-state';

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

  useEffect(() => {
    if (state.status !== 'success') return;
    const timeout = window.setTimeout(() => {
      try {
        window.close();
      } catch {
        // Ignored — window.close may throw if the tab wasn't opened programmatically.
      }
    }, 2500);
    return () => window.clearTimeout(timeout);
  }, [state]);

  async function handleGrantAccess(): Promise<void> {
    if (state.status === 'pending') {
      return;
    }
    setState({ status: 'pending' });
    try {
      const {
        handle,
        managedRelativePath,
        createdManagedFolder,
        parentDirectoryName,
      } = await requestDownloadsAccess();
      const permission = await verifyDirectoryPermission(handle);
      if (permission !== 'granted') {
        throw new Error('Permission not granted');
      }
      await storeDirectoryHandle(handle, { relativePath: managedRelativePath });
      await updateLastVerified();
      await markOnboardingCompleted();
      setState({
        status: 'success',
        grantedAt: Date.now(),
        managedRelativePath,
        createdManagedFolder,
        parentDirectoryName,
      });
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
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-10">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-default-400">
            NewName Setup
          </p>
          <h1 className="text-2xl font-semibold">
            Grant access to your managed Downloads folder
          </h1>
          <p className="text-sm leading-relaxed text-default-500">
            You&apos;re almost done. Use the picker to make or choose any folder
            you want NewName to manage (for example{' '}
            <span className="font-semibold">Downloads/Organized</span> or{' '}
            <span className="font-semibold">Desktop/NewName</span>). Select it,
            allow the prompt, and NewName will take it from there.
          </p>
        </header>

        {state.status === 'success' ? (
          <div className="rounded-2xl border border-success-200 bg-success-50/80 p-5 shadow-sm">
            <div className="flex flex-wrap items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success-100 text-success-700">
                <CheckCircleIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1 space-y-2 text-sm text-success-800">
                <div className="space-y-1">
                  <p className="font-semibold">All set! Access granted.</p>
                  <p className="text-xs text-success-600">
                    Granted at {new Date(state.grantedAt).toLocaleTimeString()}.
                  </p>
                </div>
                <div className="rounded-lg bg-white/70 px-3 py-2 text-xs text-success-700 shadow-inner">
                  <p className="font-medium">Managed folder</p>
                  <p className="truncate font-mono text-[11px] uppercase tracking-wide text-success-600">
                    {state.managedRelativePath}
                  </p>
                  {state.createdManagedFolder ? (
                    <p className="mt-1 text-[11px] text-success-500">
                      We created this folder for you.
                    </p>
                  ) : null}
                </div>
                <p className="text-xs text-success-700">
                  You can close this tab and return to the popup whenever
                  you&apos;re ready.
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

        <section className="space-y-3 rounded-lg border border-default-200 bg-default-50/40 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-default-500">
            Steps
          </h2>
          <ol className="space-y-3 text-sm leading-relaxed text-default-600">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-5 w-5 rounded-full bg-primary/10 text-center text-[11px] leading-5 text-primary">
                1
              </span>
              <span>Click “Grant access”. A folder window appears.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-5 w-5 rounded-full bg-primary/10 text-center text-[11px] leading-5 text-primary">
                2
              </span>
              <span>Pick or create the folder you want NewName to use.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-5 w-5 rounded-full bg-primary/10 text-center text-[11px] leading-5 text-primary">
                3
              </span>
              <span>
                Press “Select” and approve the Chrome permission prompt.
              </span>
            </li>
          </ol>
        </section>

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
          <button
            type="button"
            onClick={() => {
              void handleGrantAccess();
            }}
            disabled={state.status === 'pending' || state.status === 'success'}
            className={`inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition ${
              state.status === 'pending' || state.status === 'success'
                ? 'cursor-not-allowed opacity-60'
                : 'hover:opacity-90'
            }`}
          >
            {state.status === 'pending' ? 'Requesting access…' : 'Grant access'}
          </button>
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
