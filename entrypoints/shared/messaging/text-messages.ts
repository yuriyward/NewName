/**
 * Text analysis and AI pipeline messages
 * Handles text ingestion, AI model management, telemetry, and cloud consent
 */

import type {
  AiModelStatusMap,
  EnsureAiModelsOptions,
} from '@/entrypoints/shared/integrations/chrome-ai/model-status';
import type {
  CloudConsentDecision,
  CloudConsentRequestDetails,
  TextAnalysisMode,
  TextUpgradeAnalysisRequest,
  TextUpgradeAnalysisResponse,
  TextUpgradeModelSource,
} from '@/entrypoints/shared/integrations/text-analysis/types';
import { sendExtensionMessage } from './extension-messaging';

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

/**
 * Text analysis and AI pipeline protocol
 */
export interface TextAnalysisProtocol {
  /**
   * Request text ingestion and analysis preparation inside the offscreen document.
   */
  requestTextIngestion(
    payload: TextUpgradeAnalysisRequest,
  ): Promise<TextUpgradeAnalysisResponse>;

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
}

export async function requestTextIngestion(
  payload: TextUpgradeAnalysisRequest,
): Promise<TextUpgradeAnalysisResponse> {
  const result = await sendExtensionMessage('requestTextIngestion', payload);
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
