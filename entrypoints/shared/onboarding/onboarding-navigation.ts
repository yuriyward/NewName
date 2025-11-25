/**
 * Onboarding navigation logic
 * Determines post-downloads navigation based on user status
 */
import { browser } from 'wxt/browser';
import { ensureLocalAiSetup } from '@/entrypoints/shared/integrations/chrome-ai/ensure-local-ai-setup';
import { getInstallDate } from '@/entrypoints/shared/lifecycle/install-tracking';
import { getSettings } from '@/entrypoints/shared/settings/settings';
import {
  AI_MODE_SELECTION_FEATURE_DATE,
  getOnboardingState,
} from './onboarding-state';

/**
 * Check if user needs to see AI mode selection screen.
 * Only new installs after feature launch who haven't chosen yet.
 */
export async function needsAiModeSelection(): Promise<boolean> {
  // Already selected? Skip.
  const state = await getOnboardingState();
  if (state.aiModeSelected) return false;

  // Existing user (installed before feature)? Skip.
  const installDate = await getInstallDate();
  if (!installDate || installDate.getTime() < AI_MODE_SELECTION_FEATURE_DATE)
    return false;

  // User already configured settings manually? Skip.
  const settings = await getSettings();
  if (settings.processingPreferences.global !== 'auto') return false;

  return true;
}

/**
 * Navigate to appropriate page after downloads permission completes.
 * New installs → AI mode selection
 * Existing users → AI setup (if needed)
 */
export async function navigateAfterDownloadsSetup(): Promise<void> {
  if (await needsAiModeSelection()) {
    const url = browser.runtime.getURL(
      '/ai-mode-selection.html' as '/ai-model-setup.html',
    );
    await browser.tabs.create({ url });
  } else {
    // Existing behavior for users who skip selection screen
    await ensureLocalAiSetup();
  }
}
