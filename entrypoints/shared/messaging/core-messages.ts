/**
 * Core infrastructure messages
 * Handles runtime context, offscreen lifecycle, and UI toast notifications
 */

import type { SendMessageOptions } from '@webext-core/messaging';
import type {
  ConfirmToastCountdownControlMessage,
  ConfirmToastDecisionMessage,
  ConfirmToastProposal,
  ConfirmToastStatusMessage,
  ConfirmToastTimingUpdateMessage,
  ShowConfirmToastMessage,
  ShowRenameToastMessage,
} from '@/entrypoints/shared/toast/types';
import { sendExtensionMessage } from './extension-messaging';

/**
 * Core infrastructure protocol
 */
export interface CoreProtocol {
  /**
   * Resolve runtime context metadata for the current script execution environment.
   */
  resolveRuntimeContext(): {
    tabId?: number;
    frameId?: number;
    url?: string | null;
  };

  /**
   * Ensure the offscreen document and MediaInfo WASM are ready to accept analysis requests.
   */
  offscreenHandshake(): Promise<{ ready: true }>;

  /**
   * Emitted by the offscreen document when it has loaded and registered its listeners.
   */
  offscreenReady(payload?: { ts?: number }): { ok: true };

  /**
   * Request the active tab to render a confirmation toast UI.
   */
  showConfirmToast(payload: ShowConfirmToastMessage): { ok: true };

  /**
   * Update the countdown timing details for an existing confirm toast.
   */
  updateConfirmToastTiming(payload: ConfirmToastTimingUpdateMessage): {
    ok: true;
  };

  /**
   * User decision returned from content script after interacting with the toast.
   */
  confirmToastDecision(payload: ConfirmToastDecisionMessage): { ok: true };

  /**
   * Control countdown behavior (pause/resume) for a confirm toast.
   */
  controlConfirmToastCountdown(payload: ConfirmToastCountdownControlMessage): {
    ok: true;
  };

  /**
   * Status updates for an in-flight confirmation toast (dismissed, applied, error).
   */
  confirmToastStatus(payload: ConfirmToastStatusMessage): { ok: true };

  /**
   * Request any pending confirm toasts for the caller's tab so the UI can resync after reload.
   */
  syncConfirmToasts(): { proposals: ConfirmToastProposal[] };

  /**
   * Show a non-blocking rename-complete toast in the active tab.
   */
  showRenameToast(payload: ShowRenameToastMessage): { ok: true };

  /**
   * Get system memory information for AI mode recommendations.
   * Returns total system RAM in gigabytes.
   */
  getSystemMemoryInfo(): Promise<{ totalCapacityGB: number }>;
}

export async function offscreenHandshake(): Promise<{ ready: true }> {
  const result = await sendExtensionMessage('offscreenHandshake');
  return await result;
}

export async function signalOffscreenReady(): Promise<{ ok: true }> {
  const result = await sendExtensionMessage('offscreenReady', {
    ts: Date.now(),
  });
  return await result;
}

export async function sendShowConfirmToast(
  payload: ShowConfirmToastMessage,
  target: SendMessageOptions | number,
): Promise<{ ok: true }> {
  const result = await sendExtensionMessage(
    'showConfirmToast',
    payload,
    target,
  );
  return await result;
}

export async function sendConfirmToastTimingUpdate(
  payload: ConfirmToastTimingUpdateMessage,
  target: SendMessageOptions | number,
): Promise<{ ok: true }> {
  const result = await sendExtensionMessage(
    'updateConfirmToastTiming',
    payload,
    target,
  );
  return await result;
}

export async function sendConfirmToastDecision(
  payload: ConfirmToastDecisionMessage,
): Promise<{ ok: true }> {
  const result = await sendExtensionMessage('confirmToastDecision', payload);
  return await result;
}

export async function sendConfirmToastCountdownControl(
  payload: ConfirmToastCountdownControlMessage,
): Promise<{ ok: true }> {
  const result = await sendExtensionMessage(
    'controlConfirmToastCountdown',
    payload,
  );
  return await result;
}

export async function sendConfirmToastStatus(
  payload: ConfirmToastStatusMessage,
  target: SendMessageOptions | number,
): Promise<{ ok: true }> {
  const result = await sendExtensionMessage(
    'confirmToastStatus',
    payload,
    target,
  );
  return await result;
}

export async function sendShowRenameToast(
  payload: ShowRenameToastMessage,
  target: SendMessageOptions | number,
): Promise<{ ok: true }> {
  const result = await sendExtensionMessage('showRenameToast', payload, target);
  return await result;
}

export async function requestPendingConfirmToasts(): Promise<{
  proposals: ConfirmToastProposal[];
}> {
  const result = await sendExtensionMessage('syncConfirmToasts');
  return await result;
}

export async function getSystemMemoryInfo(): Promise<{
  totalCapacityGB: number;
}> {
  const result = await sendExtensionMessage('getSystemMemoryInfo');
  return await result;
}
