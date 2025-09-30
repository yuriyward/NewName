/**
 * Central extension messaging protocol using @webext-core/messaging
 */
import { defineExtensionMessaging } from '@webext-core/messaging';
import type {
  MediaAnalysisRequest,
  MediaAnalysisResponse,
} from '@/entrypoints/shared/integrations/mediainfo/messages';

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
