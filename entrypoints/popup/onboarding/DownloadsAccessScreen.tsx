import { Alert } from '@heroui/alert';
import { type JSX, useState } from 'react';
import { browser } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { markOnboardingSkipped } from '@/entrypoints/shared/onboarding/onboarding-state';

export interface DownloadsAccessScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function DownloadsAccessScreen({
  onComplete,
  onSkip,
}: DownloadsAccessScreenProps): JSX.Element {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpenSetupTab(): Promise<void> {
    if (opening) return;
    setOpening(true);
    setError(null);
    try {
      const url = browser.runtime.getURL('/downloads-permission.html');
      await browser.tabs.create({ url });
      onComplete();
      // Close the popup so the user can focus on the setup tab.
      window.close();
    } catch (err) {
      debugLogger.error('[DownloadsAccessScreen] Failed to open setup tab', {
        error: err,
      });
      setError(
        err instanceof Error
          ? err.message
          : 'Could not open the setup tab. Please try again.',
      );
    } finally {
      setOpening(false);
    }
  }

  async function handleSkip(): Promise<void> {
    try {
      await markOnboardingSkipped();
      onSkip();
    } catch (err) {
      debugLogger.error('[DownloadsAccessScreen] Failed to skip onboarding', {
        error: err,
      });
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to skip onboarding right now.',
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">Enable Downloads Access</h1>
        <p className="text-xs leading-relaxed text-default-500">
          Choose where NewName should save and rename files. Click below to open
          the setup page, finish the quick prompt, and you&apos;re all set.
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
            void handleOpenSetupTab();
          }}
          disabled={opening}
          className="inline-flex items-center justify-center rounded bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {opening ? 'Opening…' : 'Open setup tab'}
        </button>
        <button
          type="button"
          onClick={() => {
            void handleSkip();
          }}
          disabled={opening}
          className="inline-flex items-center justify-center rounded border border-default-300 px-3 py-2 text-sm font-semibold text-default-600 transition hover:bg-default-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Skip for now
        </button>
      </div>

      <footer className="text-[11px] leading-relaxed text-default-400">
        Skipping keeps NewName from renaming files automatically. Grant access
        later to enable post-download renames and undo.
      </footer>
    </div>
  );
}
