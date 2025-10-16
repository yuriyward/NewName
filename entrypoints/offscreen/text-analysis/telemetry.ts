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
