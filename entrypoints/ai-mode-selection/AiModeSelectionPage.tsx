import { useTheme } from '@heroui/use-theme';
import { type JSX, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { getSystemMemoryInfo } from '@/entrypoints/shared/messaging/core-messages';
import { markAiModeSelected } from '@/entrypoints/shared/onboarding/onboarding-state';
import {
  getSettings,
  subscribeSettings,
  updateSettings,
} from '@/entrypoints/shared/settings/settings';
import { getAppropriateTheme } from '@/entrypoints/shared/ui/theme-service';
import { CloudAiOption } from './components/CloudAiOption';
import { ConsentModal } from './components/ConsentModal';
import { LocalAiOption } from './components/LocalAiOption';

const RAM_THRESHOLD_GB = 16;

type PageState =
  | { status: 'loading' }
  | { status: 'ready'; ramGB: number }
  | { status: 'navigating'; choice: 'local' | 'cloud' | 'manual' }
  | { status: 'error'; message: string };

type ConsentModalState =
  | { open: false }
  | { open: true; choice: 'local' | 'cloud' };

export function AiModeSelectionPage(): JSX.Element {
  const { setTheme } = useTheme();
  const [state, setState] = useState<PageState>({ status: 'loading' });
  const [consentModal, setConsentModal] = useState<ConsentModalState>({
    open: false,
  });

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
        debugLogger.error('[AiModeSelection] Failed to load theme', {
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

  // Fetch RAM info on mount
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { totalCapacityGB } = await getSystemMemoryInfo();
        if (!active) return;
        setState({ status: 'ready', ramGB: totalCapacityGB });
      } catch (error) {
        debugLogger.error('[AiModeSelection] Failed to load initial state', {
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

  // Called when user clicks on Local AI or Cloud AI option
  function handleOptionSelect(choice: 'local' | 'cloud'): void {
    if (state.status !== 'ready') return;
    // Show consent modal instead of proceeding directly
    setConsentModal({ open: true, choice });
  }

  // Called when user confirms consent in the modal
  async function handleConsentConfirm(): Promise<void> {
    if (!consentModal.open) return;
    const choice = consentModal.choice;

    setState({ status: 'navigating', choice });
    setConsentModal({ open: false });

    try {
      const settings = await getSettings();
      const pageContextConsent = {
        consentGranted: true,
        consentTimestamp: Date.now(),
      };

      if (choice === 'local') {
        // Set processing mode to local and save consent
        await updateSettings({
          processingPreferences: {
            ...settings.processingPreferences,
            global: 'local',
          },
          pageContextConsent,
        });
      } else {
        // Set processing mode to cloud, enable cloud, and save consent
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
          pageContextConsent,
        });
      }

      // Mark AI mode as selected (prevents showing screen again)
      await markAiModeSelected();

      // Navigate to appropriate next screen
      const url =
        choice === 'local'
          ? browser.runtime.getURL('/ai-model-setup.html')
          : browser.runtime.getURL('/settings.html');

      const newTab = await browser.tabs.create({ url });

      // Close current tab once new tab is successfully created
      if (newTab.id) {
        window.close();
      }
    } catch (error) {
      debugLogger.error('[AiModeSelection] Failed to save choice', { error });
      setState({
        status: 'error',
        message: 'Failed to save your choice. Please try again.',
      });
    }
  }

  // Called when user declines consent (clicks Continue without checking box)
  async function handleConsentDecline(): Promise<void> {
    setConsentModal({ open: false });
    setState({ status: 'navigating', choice: 'manual' });

    try {
      const settings = await getSettings();

      // Set processing mode to manual (keep-original strategy)
      await updateSettings({
        instantBaselineStrategy: 'keep-original',
        processingPreferences: {
          ...settings.processingPreferences,
          global: 'auto', // Keep auto but with keep-original strategy
        },
        pageContextConsent: {
          consentGranted: false,
          consentTimestamp: null,
        },
      });

      // Mark AI mode as selected (prevents showing screen again)
      await markAiModeSelected();

      // Close the tab
      window.close();
    } catch (error) {
      debugLogger.error('[AiModeSelection] Failed to save manual choice', {
        error,
      });
      setState({
        status: 'error',
        message: 'Failed to save your choice. Please try again.',
      });
    }
  }

  // Called when user cancels the consent modal
  function handleConsentCancel(): void {
    setConsentModal({ open: false });
  }

  const ramGB = state.status === 'ready' ? state.ramGB : 0;
  const recommendation = ramGB >= RAM_THRESHOLD_GB ? 'local' : 'cloud';
  const isNavigating = state.status === 'navigating';
  const isLoading = state.status === 'loading';

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
            onSelect={() => handleOptionSelect('local')}
            disabled={isNavigating || isLoading}
            loading={state.status === 'navigating' && state.choice === 'local'}
          />

          <CloudAiOption
            recommended={recommendation === 'cloud'}
            onSelect={() => handleOptionSelect('cloud')}
            disabled={isNavigating || isLoading}
            loading={state.status === 'navigating' && state.choice === 'cloud'}
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

      {/* Consent Modal - shown when user selects an AI option */}
      <ConsentModal
        open={consentModal.open}
        choice={consentModal.open ? consentModal.choice : 'local'}
        onConfirm={handleConsentConfirm}
        onDecline={handleConsentDecline}
        onCancel={handleConsentCancel}
        loading={isNavigating}
      />
    </div>
  );
}
