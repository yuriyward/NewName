/**
 * Settings page for cloud AI and processing preferences
 */

import { SunIcon } from '@heroicons/react/16/solid';
import { Cog6ToothIcon, MoonIcon } from '@heroicons/react/24/outline';
import { Card } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { Spinner } from '@heroui/spinner';
import { useTheme } from '@heroui/use-theme';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconButton } from '@/entrypoints/popup/components/IconButton';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  getSettings,
  subscribeSettings,
  updateSettings,
} from '@/entrypoints/shared/settings/settings';
import type { Settings } from '@/entrypoints/shared/settings/types';
import { getAppropriateTheme } from '@/entrypoints/shared/ui/theme-service';
import { CloudAiSection } from './components/CloudAiSection';
import { LocalAiModelSection } from './components/LocalAiModelSection';
import { ProcessingPreferencesSection } from './components/ProcessingPreferences';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const themeRef = useRef<'light' | 'dark'>('dark');

  // Load settings and subscribe to changes
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    getSettings()
      .then((loadedSettings) => {
        if (!active) return;
        setSettings(loadedSettings);

        // Apply theme from settings
        const appropriateTheme = getAppropriateTheme(loadedSettings.theme);
        themeRef.current = appropriateTheme;
        setTheme(appropriateTheme);
      })
      .catch((err) => {
        debugLogger.error('Failed to load settings', { error: err });
      });

    // Subscribe to settings changes (syncs with popup)
    unsubscribe = subscribeSettings((updatedSettings) => {
      if (!active) return;
      setSettings(updatedSettings);

      // Update theme if changed from another context (e.g., popup)
      if (updatedSettings.theme !== themeRef.current) {
        themeRef.current = updatedSettings.theme;
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

  const handleCloudUpdate = (updates: Partial<Settings['cloud']>) => {
    if (!settings) return;

    const newSettings = {
      ...settings,
      cloud: { ...settings.cloud, ...updates },
    };
    setSettings(newSettings);
    updateSettings(newSettings);
    showSavedIndicator();
  };

  const handlePreferencesUpdate = (
    updates: Partial<Settings['processingPreferences']>,
  ) => {
    if (!settings) return;

    const newSettings = {
      ...settings,
      processingPreferences: { ...settings.processingPreferences, ...updates },
    };
    setSettings(newSettings);
    updateSettings(newSettings);
    showSavedIndicator();
  };

  const showSavedIndicator = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateThemePreference = useCallback(
    async (newTheme: 'light' | 'dark') => {
      themeRef.current = newTheme;
      setTheme(newTheme);
      try {
        await updateSettings({ theme: newTheme });
      } catch (err) {
        debugLogger.error('Failed to save theme', { error: err });
      }
    },
    [setTheme],
  );

  if (!settings) {
    return (
      <div className="min-h-screen bg-[var(--heroui-background)] flex items-center justify-center">
        <Spinner size="lg" label="Loading settings..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--heroui-background)]">
      <header className="border-b border-[var(--heroui-content3)] bg-[var(--heroui-content1)]">
        <div className="max-w-4xl mx-auto px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Cog6ToothIcon className="size-5" />
              <div>
                <h1 className="text-lg font-bold">Settings</h1>
                <p className="text-xs text-default-600">
                  Configure AI processing and preferences
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saved && (
                <Chip color="success" variant="flat" size="sm">
                  Saved
                </Chip>
              )}
              <IconButton
                onClick={() => {
                  const newTheme = theme === 'dark' ? 'light' : 'dark';
                  void updateThemePreference(newTheme);
                }}
                icon={
                  theme === 'dark' ? (
                    <SunIcon className="size-4" />
                  ) : (
                    <MoonIcon className="size-4" />
                  )
                }
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 py-3 space-y-3">
        <CloudAiSection
          cloudSettings={settings.cloud}
          onUpdate={handleCloudUpdate}
        />

        <ProcessingPreferencesSection
          preferences={settings.processingPreferences}
          onUpdate={handlePreferencesUpdate}
        />

        <LocalAiModelSection preferences={settings.processingPreferences} />

        <Card className="p-2.5">
          <h3 className="text-sm font-semibold mb-2">About Cloud Processing</h3>
          <div className="text-xs text-default-600 space-y-1.5">
            <p>
              <strong className="text-foreground">Privacy-first design:</strong>{' '}
              Only processed data (text snippets, downscaled images) is sent to
              cloud AI. Raw files never leave your device.
            </p>
            <p>
              <strong className="text-foreground">Local-first default:</strong>{' '}
              On-device AI (Chrome's built-in Gemini Nano) is always tried
              first. Cloud is only used as a fallback when local AI is
              unavailable.
            </p>
            <p>
              <strong className="text-foreground">Your API key:</strong> You
              provide your own Google Gemini API key, ensuring you have full
              control over usage and costs.
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}
