import { type JSX, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { getSystemMemoryInfo } from '@/entrypoints/shared/messaging/core-messages';
import { markAiModeSelected } from '@/entrypoints/shared/onboarding/onboarding-state';
import {
  getSettings,
  updateSettings,
} from '@/entrypoints/shared/settings/settings';
import { CloudAiOption } from './components/CloudAiOption';
import { LocalAiOption } from './components/LocalAiOption';

const RAM_THRESHOLD_GB = 16;

type PageState =
  | { status: 'loading' }
  | { status: 'ready'; ramGB: number }
  | { status: 'navigating'; choice: 'local' | 'cloud' }
  | { status: 'error'; message: string };

export function AiModeSelectionPage(): JSX.Element {
  const [state, setState] = useState<PageState>({ status: 'loading' });

  // Fetch RAM info on mount
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { totalCapacityGB } = await getSystemMemoryInfo();
        if (!active) return;
        setState({ status: 'ready', ramGB: totalCapacityGB });
      } catch (error) {
        debugLogger.error('[AiModeSelection] Failed to load RAM info', {
          error,
        });
        if (!active) return;
        setState({
          status: 'error',
          message: 'Could not detect system specifications. Please try again.',
        });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleChoice(choice: 'local' | 'cloud'): Promise<void> {
    if (state.status !== 'ready') return;

    setState({ status: 'navigating', choice });

    try {
      const settings = await getSettings();

      if (choice === 'local') {
        // Set processing mode to local
        await updateSettings({
          processingPreferences: {
            ...settings.processingPreferences,
            global: 'local',
          },
        });
      } else {
        // Set processing mode to cloud and enable cloud
        await updateSettings({
          processingPreferences: {
            ...settings.processingPreferences,
            global: 'cloud',
          },
          cloud: {
            ...settings.cloud,
            enabled: true,
            consentGiven: true,
            consentTimestamp: Date.now(),
          },
        });
      }

      // Mark AI mode as selected (prevents showing screen again)
      await markAiModeSelected();

      // Navigate to appropriate next screen
      const url =
        choice === 'local'
          ? browser.runtime.getURL('/ai-model-setup.html')
          : browser.runtime.getURL('/settings.html');

      await browser.tabs.create({ url });

      // Close current tab after brief delay
      setTimeout(() => {
        try {
          window.close();
        } catch {
          // Tab can't be closed programmatically in some contexts
        }
      }, 500);
    } catch (error) {
      debugLogger.error('[AiModeSelection] Failed to save choice', { error });
      setState({
        status: 'error',
        message: 'Failed to save your choice. Please try again.',
      });
    }
  }

  const ramGB = state.status === 'ready' ? state.ramGB : 0;
  const recommendation = ramGB >= RAM_THRESHOLD_GB ? 'local' : 'cloud';
  const isNavigating = state.status === 'navigating';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-primary-50/40 via-transparent to-transparent" />

      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-10">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-default-400">
            NewName Setup · Step 2 of 3
          </p>
          <h1 className="text-2xl font-semibold">Choose AI processing mode</h1>
        </header>

        {state.status === 'error' && (
          <div className="rounded-2xl border border-danger-200 bg-danger-50/80 p-4">
            <p className="text-sm font-semibold text-danger-700">
              {state.message}
            </p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <LocalAiOption
            recommended={recommendation === 'local'}
            ramGB={ramGB}
            meetsRamRequirement={ramGB >= RAM_THRESHOLD_GB}
            onSelect={() => handleChoice('local')}
            disabled={isNavigating || state.status === 'loading'}
            loading={isNavigating && state.choice === 'local'}
          />

          <CloudAiOption
            recommended={recommendation === 'cloud'}
            onSelect={() => handleChoice('cloud')}
            disabled={isNavigating || state.status === 'loading'}
            loading={isNavigating && state.choice === 'cloud'}
          />
        </div>

        <footer className="mt-auto space-y-2 text-xs text-default-400">
          <p>You can change this anytime in Settings.</p>
          <button
            type="button"
            onClick={() => window.close()}
            className="text-default-500 hover:text-default-700 underline"
          >
            I'll choose later
          </button>
        </footer>
      </main>
    </div>
  );
}
