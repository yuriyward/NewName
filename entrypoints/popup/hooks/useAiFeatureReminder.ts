/**
 * Hook for managing AI feature reminder state in the popup
 * Handles visibility logic, dismissal, and navigation to AI setup
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { shouldShowAiFeatureReminder } from '@/entrypoints/shared/settings/reminder-helpers';
import { subscribeSettings } from '@/entrypoints/shared/settings/settings';
import {
  checkAndMarkReminderState,
  handleTryAiAction,
} from './ai-feature-reminder-service';

interface UseAiFeatureReminderResult {
  /** Whether the reminder banner should be visible */
  showReminder: boolean;
  /** Whether the reminder state is still loading */
  loading: boolean;
  /** Handle user clicking "Try AI Features" */
  handleTryAi: () => Promise<void>;
  /** Handle user clicking "Remind me later" (snoozes for cooldown period) */
  handleRemindLater: () => void;
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

  // Use ref to track if reminder was marked shown this session
  // This avoids the dependency array issue and prevents infinite loops
  const reminderMarkedShownRef = useRef(false);

  // Check if reminder should be shown on mount and subscribe to changes
  useEffect(() => {
    let active = true;

    async function initializeReminderState() {
      try {
        const result = await checkAndMarkReminderState(
          localAiReady,
          reminderMarkedShownRef.current,
        );

        if (!active) return;

        setShowReminder(result.shouldShow);
        setLoading(false);

        // Update ref if reminder was marked shown
        if (result.wasMarkedShown) {
          reminderMarkedShownRef.current = true;
        }
      } catch (error) {
        debugLogger.error('[useAiFeatureReminder] Failed to check reminder', {
          error,
        });
        if (!active) return;
        setLoading(false);
      }
    }

    void initializeReminderState();

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
  }, [localAiReady]);

  // Handle user clicking "Try AI Features"
  const handleTryAi = useCallback(async () => {
    const success = await handleTryAiAction();
    if (success) {
      setShowReminder(false);
    }
  }, []);

  // Handle "Remind me later" - snooze for cooldown period
  // The reminder state was already updated when shown, so just hide the banner
  // It will reappear after the cooldown period (1 day)
  const handleRemindLater = useCallback(() => {
    setShowReminder(false);
  }, []);

  return {
    showReminder,
    loading,
    handleTryAi,
    handleRemindLater,
  };
}
