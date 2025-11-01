/**
 * Utilities for checking and ensuring local AI setup is complete.
 * Used across Settings and Downloads Permission screens to guide users through AI setup.
 */

import { browser, type PublicPath } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  AI_MODEL_IDS,
  type AiModelStatusMap,
  refreshAiModelStatuses,
} from './model-status';
import { getAiModelSetupState } from './setup-state';

/**
 * Checks if local AI setup is needed.
 * Local AI is considered "setup" when:
 * - Setup was previously completed (setupCompletedAt exists), OR
 * - All required models are in 'available' or 'unsupported' state
 *
 * @returns true if setup is needed, false if already complete
 */
export async function isLocalAiSetupNeeded(): Promise<boolean> {
  try {
    // First check if setup was previously completed
    const setupState = await getAiModelSetupState();
    if (setupState.setupCompletedAt) {
      return false;
    }

    // Check current model statuses
    const statuses = await refreshAiModelStatuses();
    return hasBlockingModels(statuses);
  } catch (error) {
    debugLogger.warn('[ensureLocalAiSetup] Failed to check AI setup status', {
      error,
    });
    // If we can't check, assume setup is NOT needed to avoid blocking the user
    return false;
  }
}

/**
 * Checks if there are any models that are blocking (not available/unsupported)
 */
function hasBlockingModels(statuses: AiModelStatusMap): boolean {
  return AI_MODEL_IDS.some((id) => {
    const state = statuses[id].state;
    return state !== 'available' && state !== 'unsupported';
  });
}

/**
 * Opens the AI model setup page in a new tab.
 * This page guides users through downloading required AI models.
 *
 * @returns Promise that resolves when the tab is created
 */
export async function openAiModelSetupPage(): Promise<void> {
  try {
    const url = browser.runtime.getURL('/ai-model-setup.html' as PublicPath);
    await browser.tabs.create({ url });
    debugLogger.log('[ensureLocalAiSetup] Opened AI model setup page');
  } catch (error) {
    debugLogger.error('[ensureLocalAiSetup] Failed to open AI setup page', {
      error,
    });
    throw error;
  }
}

/**
 * Checks if local AI setup is needed and opens the setup page if necessary.
 * This is a convenience function combining the check and open operations.
 *
 * @returns Promise<boolean> - true if setup page was opened, false if setup not needed
 */
export async function ensureLocalAiSetup(): Promise<boolean> {
  const needsSetup = await isLocalAiSetupNeeded();
  if (needsSetup) {
    await openAiModelSetupPage();
    return true;
  }
  return false;
}
