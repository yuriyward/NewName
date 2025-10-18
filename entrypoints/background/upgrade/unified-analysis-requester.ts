/**
 * Unified upgrade analysis router
 * Routes to text or image analysis based on file type
 */

import type { UpgradeProposal } from '@/entrypoints/shared/history/types';
import type { CloudConsentRequestContext } from './cloud-consent-manager';
import { createImageUpgradeAnalysisRequester } from './image-analysis-request';
import { createTextUpgradeAnalysisRequester } from './text-analysis-request';
import type { UpgradeAnalysisInput } from './types';

export interface UnifiedAnalysisRequesterDependencies {
  requestCloudConsent?: (
    context: CloudConsentRequestContext,
  ) => Promise<'allow-once' | 'allow-always' | 'deny'>;
  applyCloudAlways?: () => Promise<void>;
}

/**
 * Create a unified analysis requester that routes to text or image analysis
 * based on the file type of the download
 *
 * @param deps - Optional dependencies for cloud consent flows (text-only)
 * @returns Function that analyzes either text or image files
 */
export function createUnifiedUpgradeAnalysisRequester(
  deps: UnifiedAnalysisRequesterDependencies = {},
): (input: UpgradeAnalysisInput) => Promise<UpgradeProposal | null> {
  const textRequester = createTextUpgradeAnalysisRequester(deps);
  const imageRequester = createImageUpgradeAnalysisRequester();

  return async (
    input: UpgradeAnalysisInput,
  ): Promise<UpgradeProposal | null> => {
    const fileType = input.historyItem.fileType;

    // Route to image analysis for image files
    if (fileType === 'image') {
      return imageRequester(input);
    }

    // Route to text analysis for text/data files
    if (fileType === 'data') {
      return textRequester(input);
    }

    // For other file types, fall back to text requester which handles mock analysis
    return textRequester(input);
  };
}
