import { useCallback, useEffect, useRef, useState } from 'react';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  getSettings,
  type InstantBaselineStrategy,
  subscribeSettings,
  updateSettings,
} from '@/entrypoints/shared/settings/settings';
import type { ProcessingMode } from '@/entrypoints/shared/settings/types';

interface UsePopupSettingsResult {
  strategy: InstantBaselineStrategy | null;
  settingsTheme: 'light' | 'dark';
  processingMode: ProcessingMode | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  savedAt: number | null;
  handleStrategyChange: (strategy: InstantBaselineStrategy) => Promise<void>;
  updateThemePreference: (theme: 'light' | 'dark') => Promise<void>;
  clearError: () => void;
}

export const usePopupSettings = (
  applyTheme: (theme: 'light' | 'dark') => void,
): UsePopupSettingsResult => {
  const [strategy, setStrategy] = useState<InstantBaselineStrategy | null>(
    null,
  );
  const [settingsTheme, setSettingsTheme] = useState<'light' | 'dark'>('dark');
  const [processingMode, setProcessingMode] = useState<ProcessingMode | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const themeRef = useRef<'light' | 'dark'>('dark');

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    getSettings()
      .then((settings) => {
        if (!active) return;
        setStrategy(settings.instantBaselineStrategy);
        setSettingsTheme(settings.theme);
        setProcessingMode(settings.processingPreferences.global);
        themeRef.current = settings.theme;
        applyTheme(settings.theme);
        setLoading(false);
      })
      .catch((err) => {
        debugLogger.error('Failed to load settings', { error: err });
        if (!active) return;
        setError('Unable to load settings. Please reopen the popup.');
        setLoading(false);
      });

    unsubscribe = subscribeSettings((settings) => {
      if (!active) return;
      setStrategy(settings.instantBaselineStrategy);
      setProcessingMode(settings.processingPreferences.global);
      if (settings.theme !== themeRef.current) {
        setSettingsTheme(settings.theme);
        themeRef.current = settings.theme;
        applyTheme(settings.theme);
      }
    });

    return () => {
      active = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [applyTheme]);

  useEffect(() => {
    if (savedAt === null) return;
    const timeout = window.setTimeout(() => setSavedAt(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [savedAt]);

  const handleStrategyChange = useCallback(
    async (value: InstantBaselineStrategy) => {
      if (saving) return;
      if (strategy === value) return;

      setSaving(true);
      setError(null);

      try {
        await updateSettings({ instantBaselineStrategy: value });
        setStrategy(value);
        setSavedAt(Date.now());
      } catch (err) {
        debugLogger.error('Failed to update strategy', { error: err });
        setError('Could not save changes. Try again.');
      } finally {
        setSaving(false);
      }
    },
    [saving, strategy],
  );

  const updateThemePreference = useCallback(
    async (theme: 'light' | 'dark') => {
      setSettingsTheme(theme);
      themeRef.current = theme;
      applyTheme(theme);
      try {
        await updateSettings({ theme });
      } catch (err) {
        debugLogger.error('Failed to save theme', { error: err });
      }
    },
    [applyTheme],
  );

  return {
    strategy,
    settingsTheme,
    processingMode,
    loading,
    saving,
    error,
    savedAt,
    handleStrategyChange,
    updateThemePreference,
    clearError: () => setError(null),
  };
};
