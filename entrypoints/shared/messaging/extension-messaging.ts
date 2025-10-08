/**
 * Central extension messaging protocol using @webext-core/messaging
 */

import type { SendMessageOptions } from '@webext-core/messaging';
import { defineExtensionMessaging } from '@webext-core/messaging';
import type {
  MediaAnalysisRequest,
  MediaAnalysisResponse,
} from '@/entrypoints/shared/integrations/mediainfo/messages';
import type {
  ConfirmToastDecisionMessage,
  ConfirmToastStatusMessage,
  ShowConfirmToastMessage,
  ShowRenameToastMessage,
} from '@/entrypoints/shared/ui/confirm-toast-types';

export interface ExtensionMessagingProtocol {
  /**
   * Resolve runtime context metadata for the current script execution environment.
   */
  resolveRuntimeContext(): {
    tabId?: number;
    frameId?: number;
    url?: string | null;
  };

  /**
   * Request media metadata analysis in the offscreen document.
   */
  requestMediaAnalysis(
    payload: MediaAnalysisRequest,
  ): Promise<MediaAnalysisResponse>;

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
   * User decision returned from content script after interacting with the toast.
   */
  confirmToastDecision(payload: ConfirmToastDecisionMessage): { ok: true };

  /**
   * Status updates for an in-flight confirmation toast (dismissed, applied, error).
   */
  confirmToastStatus(payload: ConfirmToastStatusMessage): { ok: true };

  /**
   * Show a non-blocking rename-complete toast in the active tab.
   */
  showRenameToast(payload: ShowRenameToastMessage): { ok: true };
}

const extensionMessaging =
  defineExtensionMessaging<ExtensionMessagingProtocol>();

export const {
  sendMessage: sendExtensionMessage,
  onMessage: onExtensionMessage,
} = extensionMessaging;

export async function requestMediaAnalysis(
  payload: MediaAnalysisRequest,
): Promise<MediaAnalysisResponse> {
  const result = await sendExtensionMessage('requestMediaAnalysis', payload);
  return await result;
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

export async function sendConfirmToastDecision(
  payload: ConfirmToastDecisionMessage,
): Promise<{ ok: true }> {
  const result = await sendExtensionMessage('confirmToastDecision', payload);
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
