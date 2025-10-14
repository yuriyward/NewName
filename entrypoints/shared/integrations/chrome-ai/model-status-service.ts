/**
 * Proxy service for AI model status management.
 * Ensures model availability checks and downloads run in the background context
 * where storage access is guaranteed.
 */
import { defineProxyService } from '@webext-core/proxy-service';
import type {
  AiModelId,
  AiModelStatusMap,
  EnsureAiModelsOptions,
  RefreshAiModelOptions,
} from './model-status';
import {
  ensureAiModelsReady,
  getCachedAiModelStatuses,
  refreshAiModelStatuses,
  subscribeAiModelStatuses,
} from './model-status';

class AiModelStatusService {
  /**
   * Ensures the specified AI models are downloaded and ready to use.
   * Triggers downloads if needed and returns the final status map.
   */
  async ensureModelsReady(
    options: EnsureAiModelsOptions = {},
  ): Promise<AiModelStatusMap> {
    return ensureAiModelsReady(options);
  }

  /**
   * Returns the last known status for all AI models without forcing a refresh.
   */
  async getCachedStatuses(): Promise<AiModelStatusMap> {
    return getCachedAiModelStatuses();
  }

  /**
   * Refreshes availability information for the provided models and persists it.
   */
  async refreshStatuses(
    ids?: readonly AiModelId[],
    options?: RefreshAiModelOptions,
  ): Promise<AiModelStatusMap> {
    return refreshAiModelStatuses(ids, options);
  }

  /**
   * Subscribe to status updates.
   * Note: Subscriptions from proxy contexts receive a snapshot but won't
   * get live updates. For live updates, use this from the background context.
   */
  async subscribe(
    listener: (status: AiModelStatusMap) => void,
  ): Promise<() => void> {
    return subscribeAiModelStatuses(listener);
  }
}

export const [registerAiModelStatusService, getAiModelStatusService] =
  defineProxyService('AiModelStatusService', () => new AiModelStatusService());
