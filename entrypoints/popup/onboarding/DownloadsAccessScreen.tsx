/**
 * Compact downloads access onboarding screen for popup
 * Designed to be friendly and encourage users to complete setup
 */
import FolderOpenIcon from '@heroicons/react/24/outline/FolderOpenIcon';
import { Alert } from '@heroui/alert';
import { type JSX, useState } from 'react';
import { browser } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';

export interface DownloadsAccessScreenProps {
  onComplete: () => void;
}

export function DownloadsAccessScreen({
  onComplete,
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

  return (
    <div className="flex flex-col items-center gap-5 py-2 text-center">
      {/* Icon */}
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
        <FolderOpenIcon className="h-7 w-7" />
      </div>

      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-lg font-semibold text-default-900">
          Quick setup needed
        </h1>
        <p className="text-sm leading-relaxed text-default-500">
          Pick a folder so NewName can organize your downloads automatically.
        </p>
      </header>

      {/* Error */}
      {error ? (
        <Alert color="warning" variant="flat" className="text-xs">
          {error}
        </Alert>
      ) : null}

      {/* Action */}
      <button
        type="button"
        onClick={() => {
          void handleOpenSetupTab();
        }}
        disabled={opening}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-primary-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FolderOpenIcon className="h-4 w-4" />
        {opening ? 'Opening setup...' : 'Choose folder'}
      </button>

      {/* Subtle info */}
      <p className="text-[11px] text-default-400">Takes less than 30 seconds</p>
    </div>
  );
}
