/**
 * Service functions for AI feature reminder state management
 * Handles async initialization and state determination logic
 * Keeps the hook focused on React state management
 */
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { openAiModeSelectionPage } from '@/entrypoints/shared/onboarding/onboarding-navigation';
import {
  markReminderShown,
  resetReminderState,
  shouldShowAiFeatureReminder,
} from '@/entrypoints/shared/settings/reminder-helpers';
import {
  getSettings,
  updateSettings,
} from '@/entrypoints/shared/settings/settings';

/**
 * Result of checking reminder state
 */
export interface ReminderCheckResult {
  /** Whether the reminder should be shown */
  shouldShow: boolean;
  /** Whether the reminder was marked as shown (first time this session) */
  wasMarkedShown: boolean;
}

/**
 * Check if the AI feature reminder should be shown and optionally mark it as shown
 *
 * @param localAiReady - Whether local AI models are available
 * @param alreadyMarkedShown - Whether the reminder was already marked shown this session
 * @returns Result containing visibility state and whether it was marked
 */
export async function checkAndMarkReminderState(
  localAiReady: boolean,
  alreadyMarkedShown: boolean,
): Promise<ReminderCheckResult> {
  const settings = await getSettings();
  const shouldShow = shouldShowAiFeatureReminder(settings, localAiReady);

  let wasMarkedShown = false;

  // Mark reminder as shown (only once per session)
  if (shouldShow && !alreadyMarkedShown) {
    wasMarkedShown = true;
    const updatedReminder = markReminderShown(settings.aiFeatureReminder);
    await updateSettings({ aiFeatureReminder: updatedReminder });
  }

  return { shouldShow, wasMarkedShown };
}

/**
 * Handle user clicking "Try AI Features"
 * Resets reminder state and navigates to AI mode selection
 *
 * @returns true if navigation succeeded, false otherwise
 */
export async function handleTryAiAction(): Promise<boolean> {
  try {
    // Reset reminder state since user is trying AI
    await updateSettings({
      aiFeatureReminder: resetReminderState(),
    });

    // Navigate to AI mode selection page
    await openAiModeSelectionPage();

    return true;
  } catch (error) {
    debugLogger.error(
      '[ai-feature-reminder-service] Failed to navigate to AI setup',
      { error },
    );
    return false;
  }
}
