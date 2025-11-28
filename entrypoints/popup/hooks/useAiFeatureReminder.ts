/**
 * Hook for managing AI feature reminder state in the popup
 * Handles visibility logic, dismissal, and navigation to AI setup
 */
import { useCallback, useEffect, useState } from 'react';
import { browser, type PublicPath } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  markReminderShown,
  resetReminderState,
  shouldShowAiFeatureReminder,
} from '@/entrypoints/shared/settings/reminder-helpers';
import {
  getSettings,
  subscribeSettings,
  updateSettings,
} from '@/entrypoints/shared/settings/settings';

interface UseAiFeatureReminderResult {
  /** Whether the reminder banner should be visible */
  showReminder: boolean;
  /** Whether the reminder state is still loading */
  loading: boolean;
  /** Handle user clicking "Try AI Features" */
  handleTryAi: () => Promise<void>;
  /** Handle user clicking "Remind me later" (snoozes for cooldown period) */
  handleRemindLater: () => Promise<void>;
}

interface UseAiFeatureReminderOptions {
  /** Whether local AI models are ready (from useAiModelStatus) */
  localAiReady: boolean;
}

/**
 * Hook to manage the AI feature reminder banner
 *
 * Shows a gentle reminder to users who:
 * - Declined AI features (no page context consent)
 * - Chose cloud AI but haven't provided an API key
 * - Chose local AI but models aren't ready
 *
 * Tracks reminder state and handles navigation to AI mode selection.
 */
export function useAiFeatureReminder({
  localAiReady,
}: UseAiFeatureReminderOptions): UseAiFeatureReminderResult {
  const [showReminder, setShowReminder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reminderMarkedShown, setReminderMarkedShown] = useState(false);

  // Check if reminder should be shown on mount and subscribe to changes
  useEffect(() => {
    let active = true;

    async function checkReminder() {
      try {
        const settings = await getSettings();
        if (!active) return;

        const shouldShow = shouldShowAiFeatureReminder(settings, localAiReady);
        setShowReminder(shouldShow);
        setLoading(false);

        // Mark reminder as shown (only once per session)
        if (shouldShow && !reminderMarkedShown) {
          setReminderMarkedShown(true);
          const updatedReminder = markReminderShown(settings.aiFeatureReminder);
          await updateSettings({ aiFeatureReminder: updatedReminder });
        }
      } catch (error) {
        debugLogger.error('[useAiFeatureReminder] Failed to check reminder', {
          error,
        });
        if (!active) return;
        setLoading(false);
      }
    }

    void checkReminder();

    // Subscribe to settings changes
    const unsubscribe = subscribeSettings((settings) => {
      if (!active) return;
      const shouldShow = shouldShowAiFeatureReminder(settings, localAiReady);
      setShowReminder(shouldShow);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [reminderMarkedShown, localAiReady]);

  // Handle user clicking "Try AI Features"
  const handleTryAi = useCallback(async () => {
    try {
      // Reset reminder state since user is trying AI
      await updateSettings({
        aiFeatureReminder: resetReminderState(),
      });

      // Navigate to AI mode selection page
      const url = browser.runtime.getURL(
        '/ai-mode-selection.html' as PublicPath,
      );
      await browser.tabs.create({ url });

      // Hide the banner
      setShowReminder(false);
    } catch (error) {
      debugLogger.error(
        '[useAiFeatureReminder] Failed to navigate to AI setup',
        {
          error,
        },
      );
    }
  }, []);

  // Handle "Remind me later" - snooze for cooldown period
  // The reminder state was already updated when shown, so just hide the banner
  // It will reappear after the cooldown period (1 day)
  const handleRemindLater = useCallback(async () => {
    setShowReminder(false);
  }, []);

  return {
    showReminder,
    loading,
    handleTryAi,
    handleRemindLater,
  };
}
