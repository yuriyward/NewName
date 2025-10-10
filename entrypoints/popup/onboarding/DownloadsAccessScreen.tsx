import { Alert } from '@heroui/alert';
import { type JSX, useState } from 'react';
import {
  requestDownloadsAccess,
  verifyDirectoryPermission,
} from '@/entrypoints/shared/filesystem/directory-picker';
import {
  storeDirectoryHandle,
  updateLastVerified,
} from '@/entrypoints/shared/filesystem/handle-storage';
import {
  markOnboardingCompleted,
  markOnboardingSkipped,
} from './onboarding-state';

export interface DownloadsAccessScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function DownloadsAccessScreen({
  onComplete,
  onSkip,
}: DownloadsAccessScreenProps): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGrantAccess(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const handle = await requestDownloadsAccess();
      const permission = await verifyDirectoryPermission(handle);
      if (permission !== 'granted') {
        throw new Error('Permission not granted');
      }
      await storeDirectoryHandle(handle);
      await updateLastVerified();
      await markOnboardingCompleted();
      onComplete();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      if (message === 'User cancelled directory picker') {
        setError('Choose your Downloads folder to enable automatic renaming.');
      } else if (message === 'Permission not granted') {
        setError('Allow access so NewName can rename files after download.');
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSkip(): Promise<void> {
    await markOnboardingSkipped();
    onSkip();
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">Enable Downloads Access</h1>
        <p className="text-xs leading-relaxed text-default-500">
          NewName needs access to your Downloads folder so it can rename files
          after they finish downloading. You can change this later from the
          popup.
        </p>
      </header>

      {error ? (
        <Alert color="warning" variant="flat" className="text-xs">
          {error}
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            void handleGrantAccess();
          }}
          disabled={busy}
          className="inline-flex items-center justify-center rounded bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Requesting access…' : 'Allow Downloads Access'}
        </button>
        <button
          type="button"
          onClick={() => {
            void handleSkip();
          }}
          disabled={busy}
          className="inline-flex items-center justify-center rounded border border-default-300 px-3 py-2 text-sm font-semibold text-default-600 transition hover:bg-default-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Skip for now
        </button>
      </div>

      <footer className="text-[11px] leading-relaxed text-default-400">
        Skipping keeps NewName from renaming files automatically. You can grant
        access later to enable post-download renames and undo.
      </footer>
    </div>
  );
}
