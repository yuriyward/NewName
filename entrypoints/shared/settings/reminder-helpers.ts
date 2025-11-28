/**
 * Helper functions for AI feature reminder state management
 *
 * Handles the reminder logic for users without fully configured AI:
 * - First reminder: 3 days after declining AI or incomplete setup
 * - Subsequent reminders: 7 days after last reminder
 *
 * The reminder system encourages users to complete AI setup without being intrusive.
 * Users can permanently dismiss reminders via the `dismissed` flag.
 */
import type {
  CloudSettings,
  ProcessingMode,
  ReminderState,
  Settings,
} from './types';
import { validateGeminiApiKeyFormat } from './validation';

/**
 * First reminder threshold: 3 days in milliseconds
 *
 * This delay gives users time to explore the extension before prompting
 * them about AI features. Could be made user-configurable in the future
 * if users want more control over reminder frequency.
 */
export const FIRST_REMINDER_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Subsequent reminder cooldown: 7 days in milliseconds
 *
 * Longer cooldown for repeat reminders to avoid being annoying.
 * Could be made user-configurable in the future alongside FIRST_REMINDER_THRESHOLD_MS.
 */
export const SUBSEQUENT_REMINDER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Check if cloud AI is fully configured and ready to use.
 *
 * Cloud configuration requires:
 * - Cloud processing enabled
 * - User has given explicit consent for cloud data processing
 * - Valid API key format (starts with "AIza", 35-45 chars)
 *
 * Note: This validates format only, not whether the key actually works.
 * Use testCloudConnection() for runtime validation.
 *
 * @param cloud - Cloud settings to validate
 * @returns true if cloud is fully configured
 */
function isCloudConfigured(cloud: CloudSettings): boolean {
  return (
    cloud.enabled &&
    cloud.consentGiven &&
    validateGeminiApiKeyFormat(cloud.apiKey)
  );
}

/**
 * Mode validators lookup table for cleaner configuration checking.
 * Each mode has specific requirements for AI to be considered "configured":
 * - local: Requires local AI models to be downloaded and ready
 * - cloud: Requires cloud enabled, consent given, and valid API key
 * - auto: Either local OR cloud being ready is sufficient
 */
const MODE_VALIDATORS: Record<
  ProcessingMode,
  (settings: Settings, localAiReady: boolean) => boolean
> = {
  local: (_settings, localAiReady) => localAiReady,
  cloud: (settings) => isCloudConfigured(settings.cloud),
  auto: (settings, localAiReady) =>
    localAiReady || isCloudConfigured(settings.cloud),
};

/**
 * Check if AI is properly configured based on settings.
 *
 * AI is considered configured if:
 * - Page context consent is granted (required because AI features need
 *   access to page metadata for contextual renaming)
 * - The selected processing mode has its requirements met
 *
 * @param settings - Current application settings
 * @param localAiReady - Whether local AI models are available (from useAiModelStatus)
 * @returns true if AI is properly configured
 */
export function isAiConfigured(
  settings: Settings,
  localAiReady: boolean,
): boolean {
  const { pageContextConsent, processingPreferences } = settings;

  // Page context consent is required because AI features need access to
  // page metadata (title, heading, URL) for contextual renaming
  if (!pageContextConsent.consentGranted) {
    return false;
  }

  const mode = processingPreferences.global;
  const validator = MODE_VALIDATORS[mode];
  return validator(settings, localAiReady);
}

/**
 * @deprecated Use isAiConfigured instead. This alias is kept for backward compatibility.
 */
export const isAiProperlyConfigured = isAiConfigured;

/**
 * Check if user is eligible to receive an AI feature reminder.
 *
 * Eligibility requires:
 * - AI is NOT properly configured (otherwise no reminder needed)
 * - User has not permanently dismissed reminders
 * - User has gone through onboarding (has a consent timestamp)
 *
 * @param settings - Current application settings
 * @param localAiReady - Whether local AI models are available
 * @returns true if user is a candidate for receiving a reminder
 */
function isEligibleForReminder(
  settings: Settings,
  localAiReady: boolean,
): boolean {
  const { pageContextConsent, aiFeatureReminder } = settings;

  // Don't show if AI is already properly configured - no reminder needed
  if (isAiConfigured(settings, localAiReady)) {
    return false;
  }

  // Respect user's choice to permanently dismiss reminders
  if (aiFeatureReminder.dismissed) {
    return false;
  }

  // Need a timestamp to calculate elapsed time.
  // If consent was never explicitly handled (no timestamp), don't show.
  // This handles fresh installs where user hasn't gone through onboarding yet.
  if (pageContextConsent.consentTimestamp === null) {
    return false;
  }

  return true;
}

/**
 * Check if enough time has passed since the last reminder (or initial action).
 *
 * Timing rules:
 * - First reminder: 3+ days since consent action (granted or denied)
 * - Subsequent reminders: 7+ days since last reminder shown
 *
 * @param settings - Current application settings
 * @returns true if cooldown period has passed
 */
function hasReminderCooldownPassed(settings: Settings): boolean {
  const { pageContextConsent, aiFeatureReminder } = settings;

  const now = Date.now();

  // If reminder was never shown before, check first reminder threshold (3 days)
  if (aiFeatureReminder.lastShownTimestamp === null) {
    // The timestamp represents when consent was granted or denied
    const timeSinceConsentAction =
      now - (pageContextConsent.consentTimestamp ?? 0);
    return timeSinceConsentAction >= FIRST_REMINDER_THRESHOLD_MS;
  }

  // For subsequent reminders, check 7-day cooldown
  const timeSinceLastReminder = now - aiFeatureReminder.lastShownTimestamp;
  return timeSinceLastReminder >= SUBSEQUENT_REMINDER_COOLDOWN_MS;
}

/**
 * Check if the AI feature reminder should be shown.
 *
 * Combines eligibility and timing checks:
 * 1. User must be eligible (AI not configured, not dismissed, has timestamp)
 * 2. Enough time must have passed (3 days first time, 7 days subsequently)
 *
 * @param settings - Current application settings
 * @param localAiReady - Whether local AI models are available
 * @returns true if reminder should be shown
 */
export function shouldShowAiFeatureReminder(
  settings: Settings,
  localAiReady: boolean,
): boolean {
  if (!isEligibleForReminder(settings, localAiReady)) {
    return false;
  }

  return hasReminderCooldownPassed(settings);
}

/**
 * Create updated reminder state after showing the reminder.
 *
 * @param current - Current reminder state
 * @returns Updated reminder state with incremented count and new timestamp
 */
export function markReminderShown(current: ReminderState): ReminderState {
  return {
    ...current,
    count: current.count + 1,
    lastShownTimestamp: Date.now(),
  };
}

/**
 * Reset reminder state (used when user enables AI features).
 *
 * @returns Fresh reminder state
 */
export function resetReminderState(): ReminderState {
  return {
    count: 0,
    lastShownTimestamp: null,
    dismissed: false,
  };
}
