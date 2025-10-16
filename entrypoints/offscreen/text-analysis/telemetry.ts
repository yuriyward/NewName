import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type {
  TextAnalysisMode,
  TextUpgradeModelSource,
} from '@/entrypoints/shared/integrations/text-analysis/types';
import { recordAiPipelineTelemetryRemote } from '@/entrypoints/shared/messaging/extension-messaging';

export function recordPipelineBlocked(
  mode: TextAnalysisMode,
  reason: string,
): void {
  void recordAiPipelineTelemetryRemote({
    type: 'blocked',
    mode,
    reason,
  }).catch((error) => {
    debugLogger.warn('[TextUpgradeAI] Failed to record blocked telemetry', {
      mode,
      reason,
      error,
    });
  });
}

export function recordPipelineRouted(source: TextUpgradeModelSource): void {
  void recordAiPipelineTelemetryRemote({
    type: 'routed',
    source,
  }).catch((error) => {
    debugLogger.warn('[TextUpgradeAI] Failed to record routed telemetry', {
      source,
      error,
    });
  });
}

/**
 * Record when a rename decision is made by the Prompt API.
 * Tracks both keep and rename decisions with their confidence scores.
 */
export function recordDecisionMade(
  shouldRename: boolean,
  reason: string,
  confidence: number,
): void {
  console.log('[TextUpgradeAI] Decision recorded', {
    shouldRename,
    reason,
    confidence,
  });

  void recordAiPipelineTelemetryRemote({
    type: 'decision',
    shouldRename,
    reason,
    confidence,
  }).catch((error) => {
    debugLogger.warn('[TextUpgradeAI] Failed to record decision telemetry', {
      shouldRename,
      reason,
      error,
    });
  });
}

/**
 * Record successful filename generation by the Prompt API.
 */
export function recordGenerationSuccess(confidence: number): void {
  console.log('[TextUpgradeAI] Generation success recorded', {
    confidence,
  });

  void recordAiPipelineTelemetryRemote({
    type: 'generation-success',
    confidence,
  }).catch((error) => {
    debugLogger.warn('[TextUpgradeAI] Failed to record generation success', {
      error,
    });
  });
}

/**
 * Record when filename generation fails.
 */
export function recordGenerationFailure(error: string): void {
  console.log('[TextUpgradeAI] Generation failure recorded', {
    error,
  });

  void recordAiPipelineTelemetryRemote({
    type: 'generation-failure',
    error,
  }).catch((recordError) => {
    debugLogger.warn('[TextUpgradeAI] Failed to record generation failure', {
      originalError: error,
      recordError,
    });
  });
}

/**
 * Record complete prompt pipeline execution metrics.
 * Captures timing for both decision and generation phases.
 */
export function recordPromptPipelineComplete(
  decisionTimeMs: number,
  generationTimeMs: number,
): void {
  console.log('[TextUpgradeAI] Prompt pipeline complete', {
    decisionTimeMs,
    generationTimeMs,
    totalMs: decisionTimeMs + generationTimeMs,
  });

  void recordAiPipelineTelemetryRemote({
    type: 'prompt-pipeline-complete',
    decisionTimeMs,
    generationTimeMs,
    totalMs: decisionTimeMs + generationTimeMs,
  }).catch((error) => {
    debugLogger.warn('[TextUpgradeAI] Failed to record pipeline complete', {
      error,
    });
  });
}
