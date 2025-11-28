/**
 * Helper functions for AI feature reminder state management
 * Handles the reminder logic for users without fully configured AI:
 * - First reminder: 3 days after declining AI or incomplete setup
 * - Subsequent reminders: 7 days after last reminder
 */
import type { ReminderState, Settings } from './types';

/** First reminder threshold: 3 days in milliseconds */
export const FIRST_REMINDER_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;

/** Subsequent reminder cooldown: 7 days in milliseconds */
export const SUBSEQUENT_REMINDER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Check if AI is properly configured based on settings
 *
 * AI is considered configured if:
 * - Page context consent is granted AND
 * - Either local AI is ready (checked separately) OR cloud AI has an API key
 *
 * @param settings - Current application settings
 * @param localAiReady - Whether local AI models are available (from useAiModelStatus)
 * @returns true if AI is properly configured
 */
export function isAiProperlyConfigured(
  settings: Settings,
  localAiReady: boolean,
): boolean {
  const { pageContextConsent, processingPreferences, cloud } = settings;

  // Must have page context consent for any AI to work
  if (!pageContextConsent.consentGranted) {
    return false;
  }

  // Check based on processing mode
  const mode = processingPreferences.global;

  if (mode === 'cloud') {
    // Cloud mode requires API key
    return cloud.enabled && cloud.apiKey !== null && cloud.apiKey.length > 0;
  }

  if (mode === 'local') {
    // Local mode requires models to be ready
    return localAiReady;
  }

  // Auto mode: either cloud with API key OR local models ready
  if (cloud.enabled && cloud.apiKey !== null && cloud.apiKey.length > 0) {
    return true;
  }

  return localAiReady;
}

/**
 * Check if the AI feature reminder should be shown
 *
 * Conditions for showing:
 * 1. AI is NOT properly configured (no consent, or missing API key/local models)
 * 2. Either:
 *    a. Reminder has never been shown AND 3+ days since install/consent denial
 *    b. OR last reminder was shown 7+ days ago (subsequent cooldown)
 *
 * @param settings - Current application settings
 * @param localAiReady - Whether local AI models are available
 * @returns true if reminder should be shown
 */
export function shouldShowAiFeatureReminder(
  settings: Settings,
  localAiReady: boolean,
): boolean {
  const { pageContextConsent, aiFeatureReminder } = settings;

  // Don't show if AI is already properly configured
  if (isAiProperlyConfigured(settings, localAiReady)) {
    return false;
  }

  // Need a timestamp to calculate elapsed time
  // If consent was never explicitly denied (no timestamp), don't show
  // This handles fresh installs where user hasn't gone through onboarding yet
  if (pageContextConsent.consentTimestamp === null) {
    return false;
  }

  const now = Date.now();

  // If reminder was never shown before, check first reminder threshold (3 days)
  if (aiFeatureReminder.lastShownTimestamp === null) {
    const timeSinceConsentDenied = now - pageContextConsent.consentTimestamp;
    return timeSinceConsentDenied >= FIRST_REMINDER_THRESHOLD_MS;
  }

  // For subsequent reminders, check 7-day cooldown
  const timeSinceLastReminder = now - aiFeatureReminder.lastShownTimestamp;
  return timeSinceLastReminder >= SUBSEQUENT_REMINDER_COOLDOWN_MS;
}

/**
 * Create updated reminder state after showing the reminder
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
 * Reset reminder state (used when user enables AI features)
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
