import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { Alert } from '@heroui/alert';
import { type JSX, useEffect, useState } from 'react';
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
  | { status: 'success'; grantedAt: number }
  | { status: 'error'; message: string };

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
      const handle = await requestDownloadsAccess();
      const permission = await verifyDirectoryPermission(handle);
      if (permission !== 'granted') {
        throw new Error('Permission not granted');
      }
      await storeDirectoryHandle(handle);
      await updateLastVerified();
      await markOnboardingCompleted();
      setState({ status: 'success', grantedAt: Date.now() });
    } catch (err) {
      console.error('[DownloadsPermissionPage] Granting access failed', err, {
        lastPickerError:
          (
            window as typeof window & {
              __newNameLastDirectoryPickerError?: unknown;
            }
          ).__newNameLastDirectoryPickerError ?? null,
      });
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      if (err instanceof ManagedSubfolderRequiredError) {
        const details = err.details;
        const advice =
          'Chrome blocks the root Downloads folder. Create or choose a subfolder inside Downloads (for example “NewName”) and select it.';
        if (details) {
          setState({
            status: 'error',
            message: `${advice} Chrome reported: "${details.message}" (code: ${details.name}).`,
          });
        } else {
          setState({ status: 'error', message: advice });
        }
        return;
      }
      if (message === 'User cancelled directory picker') {
        const debugHint = (
          window as typeof window & {
            __newNameLastDirectoryPickerError?: unknown;
          }
        ).__newNameLastDirectoryPickerError;
        if (debugHint && typeof debugHint === 'object') {
          const { name, message: detailMessage } = debugHint as {
            name?: string;
            message?: string;
          };
          setState({
            status: 'error',
            message: `No folder selected. Chrome reported: "${detailMessage ?? 'Unknown'}" (code: ${name ?? 'Unknown'}).`,
          });
        } else {
          setState({
            status: 'error',
            message:
              'No folder selected. Choose a subfolder inside Downloads to continue.',
          });
        }
        return;
      }
      if (message === 'Permission not granted') {
        setState({
          status: 'error',
          message:
            'Allow read and write access so NewName can rename files after download.',
        });
        return;
      }
      setState({ status: 'error', message });
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
            Chrome requires a full tab to approve folder access for extensions.
            When prompted, create or select a subfolder inside Downloads (for
            example <span className="font-semibold">Downloads/NewName</span>)
            and click <span className="font-semibold">Select</span>. NewName
            will use this folder to safely rename files after they complete.
          </p>
        </header>

        {state.status === 'success' ? (
          <Alert
            color="success"
            variant="flat"
            className="flex items-start gap-3 text-sm"
          >
            <CheckCircleIcon className="mt-0.5 h-5 w-5 flex-none" />
            <div className="space-y-1">
              <p className="font-medium">
                Access granted. You can close this tab and return to the popup.
              </p>
              <p className="text-xs text-success-600">
                Granted at {new Date(state.grantedAt).toLocaleTimeString()}.
              </p>
            </div>
          </Alert>
        ) : null}

        {state.status === 'error' ? (
          <Alert color="warning" variant="flat" className="text-sm leading-6">
            {state.message}
          </Alert>
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
              <span>
                Click “Grant access”. Chrome will open a folder picker.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-5 w-5 rounded-full bg-primary/10 text-center text-[11px] leading-5 text-primary">
                2
              </span>
              <span>
                Create or choose a subfolder inside Downloads (for example{' '}
                <code className="rounded bg-default-100 px-1 py-0.5 text-[12px]">
                  Downloads/NewName
                </code>
                ) and press <span className="font-semibold">Select</span>.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-5 w-5 rounded-full bg-primary/10 text-center text-[11px] leading-5 text-primary">
                3
              </span>
              <span>
                Approve the follow-up permission prompt for read & write.
              </span>
            </li>
          </ol>
        </section>

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
          <p>
            Having trouble? Make sure you&apos;re on Chrome 122 or later and
            that the folder isn&apos;t synced or protected by another app.
          </p>
          <p>
            If the picker keeps failing, report the error code shown above so we
            can investigate.
          </p>
        </footer>
      </main>
    </div>
  );
}
