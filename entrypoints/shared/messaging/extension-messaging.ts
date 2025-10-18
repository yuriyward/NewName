/**
 * Central extension messaging protocol using @webext-core/messaging
 */

import type { SendMessageOptions } from '@webext-core/messaging';
import { defineExtensionMessaging } from '@webext-core/messaging';
import type {
  PdfUpgradeAnalysisRequest,
  PdfUpgradeAnalysisResponse,
} from '@/entrypoints/offscreen/pdf-analysis/types';
import type {
  AiModelStatusMap,
  EnsureAiModelsOptions,
} from '@/entrypoints/shared/integrations/chrome-ai/model-status';
import type {
  ImageUpgradeAnalysisRequest,
  ImageUpgradeAnalysisResponse,
} from '@/entrypoints/shared/integrations/image-analysis/types';
import type {
  MediaAnalysisRequest,
  MediaAnalysisResponse,
} from '@/entrypoints/shared/integrations/mediainfo/messages';
import type {
  CloudConsentDecision,
  CloudConsentRequestDetails,
  TextAnalysisMode,
  TextUpgradeAnalysisRequest,
  TextUpgradeAnalysisResponse,
  TextUpgradeModelSource,
} from '@/entrypoints/shared/integrations/text-analysis/types';
import type {
  ConfirmToastCountdownControlMessage,
  ConfirmToastDecisionMessage,
  ConfirmToastProposal,
  ConfirmToastStatusMessage,
  ConfirmToastTimingUpdateMessage,
  ShowConfirmToastMessage,
  ShowRenameToastMessage,
} from '@/entrypoints/shared/toast/types';

/**
 * Payload for ensuring AI models are ready with optional model-specific configuration.
 * Extends EnsureAiModelsOptions to support languageModel and summarizer options
 * for multimodal availability checks and other advanced configurations.
 */
export type EnsureAiModelsRequestPayload = EnsureAiModelsOptions;

export type AiPipelineTelemetryPayload =
  | {
      type: 'blocked';
      mode: TextAnalysisMode;
      reason: string;
    }
  | {
      type: 'routed';
      source: TextUpgradeModelSource;
    }
  | {
      type: 'decision';
      shouldRename: boolean;
      reason: string;
      confidence: number;
    }
  | {
      type: 'generation-success';
      confidence: number;
    }
  | {
      type: 'generation-failure';
      error: string;
    }
  | {
      type: 'prompt-pipeline-complete';
      decisionTimeMs: number;
      generationTimeMs: number;
      totalMs: number;
    };

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
   * Request text ingestion and analysis preparation inside the offscreen document.
   */
  requestTextIngestion(
    payload: TextUpgradeAnalysisRequest,
  ): Promise<TextUpgradeAnalysisResponse>;

  /**
   * Request image ingestion and analysis preparation inside the offscreen document.
   */
  requestImageIngestion(
    payload: ImageUpgradeAnalysisRequest,
  ): Promise<ImageUpgradeAnalysisResponse>;

  /**
   * Request PDF analysis (page extraction and image-based analysis) inside the offscreen document.
   */
  requestPdfAnalysis(
    payload: PdfUpgradeAnalysisRequest,
  ): Promise<PdfUpgradeAnalysisResponse>;

  /**
   * Retrieve pending cloud consent request details.
   */
  requestCloudConsentDetails(payload: {
    token: string;
  }): Promise<CloudConsentRequestDetails | null>;

  /**
   * Submit a cloud consent decision from the user interface.
   */
  submitCloudConsentDecision(payload: {
    token: string;
    decision: CloudConsentDecision;
  }): { ok: true };

  /**
   * Ensure the requested Chrome on-device AI models are ready.
   */
  ensureAiModelsReady(
    payload: EnsureAiModelsRequestPayload,
  ): Promise<AiModelStatusMap>;

  /**
   * Record AI pipeline telemetry events in the background context.
   */
  recordAiPipelineTelemetry(payload: AiPipelineTelemetryPayload): { ok: true };

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

export async function requestTextIngestion(
  payload: TextUpgradeAnalysisRequest,
): Promise<TextUpgradeAnalysisResponse> {
  const result = await sendExtensionMessage('requestTextIngestion', payload);
  return await result;
}

export async function requestImageIngestion(
  payload: ImageUpgradeAnalysisRequest,
): Promise<ImageUpgradeAnalysisResponse> {
  const result = await sendExtensionMessage('requestImageIngestion', payload);
  return await result;
}

export async function requestPdfAnalysis(
  payload: PdfUpgradeAnalysisRequest,
): Promise<PdfUpgradeAnalysisResponse> {
  const result = await sendExtensionMessage('requestPdfAnalysis', payload);
  return await result;
}

export async function requestCloudConsentDetails(payload: {
  token: string;
}): Promise<CloudConsentRequestDetails | null> {
  const result = await sendExtensionMessage(
    'requestCloudConsentDetails',
    payload,
  );
  return await result;
}

export async function submitCloudConsentDecision(payload: {
  token: string;
  decision: CloudConsentDecision;
}): Promise<{ ok: true }> {
  const result = await sendExtensionMessage(
    'submitCloudConsentDecision',
    payload,
  );
  return await result;
}

export async function ensureAiModelsReadyRemote(
  payload: EnsureAiModelsRequestPayload,
): Promise<AiModelStatusMap> {
  const result = await sendExtensionMessage('ensureAiModelsReady', payload);
  return await result;
}

export async function recordAiPipelineTelemetryRemote(
  payload: AiPipelineTelemetryPayload,
): Promise<{ ok: true }> {
  const result = await sendExtensionMessage(
    'recordAiPipelineTelemetry',
    payload,
  );
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
