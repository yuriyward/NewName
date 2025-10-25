/**
 * Local AI Adapter
 *
 * Wraps Chrome's built-in AI (Gemini Nano) for on-device processing.
 * This adapter delegates to existing pipeline orchestrators without changing their logic.
 */

import type { PdfUpgradeAnalysisRequest } from '@/entrypoints/offscreen/pdf-analysis/types';
import type {
  ImageIngestionResult,
  ImageUpgradeAnalysisRequest,
  ImageUpgradeAnalysisResponse,
} from '@/entrypoints/shared/integrations/image-analysis/types';
import type {
  TextUpgradeAnalysisRequest,
  TextUpgradeAnalysisResponse,
  TextUpgradeIngestionResult,
} from '@/entrypoints/shared/integrations/text-analysis/types';
import type { IAiProvider } from './types';

/**
 * Local AI provider using Chrome's built-in AI (Gemini Nano)
 *
 * This is a thin wrapper around existing pipeline orchestrators.
 * The actual AI logic lives in:
 * - entrypoints/offscreen/text-analysis/pipeline-orchestrator.ts
 * - entrypoints/offscreen/image-analysis/pipeline-orchestrator.ts
 * - entrypoints/offscreen/pdf-analysis/pdf-analysis-pipeline.ts
 */
export class LocalAiAdapter implements IAiProvider {
  readonly type = 'local' as const;

  /**
   * Check if Chrome's built-in AI is available
   *
   * Note: This is a basic check. Full availability checking happens
   * in the pipeline orchestrators when they call ensureAiModelsReady().
   */
  async isAvailable(): Promise<boolean> {
    // Check if Chrome AI APIs exist
    if (typeof window === 'undefined') {
      return false;
    }

    // Check for Prompt API (primary API for text/image analysis)
    const hasPromptApi =
      'ai' in window &&
      window.ai !== null &&
      typeof window.ai === 'object' &&
      'languageModel' in window.ai;

    return hasPromptApi;
  }

  /**
   * Analyze text using Chrome's built-in AI
   *
   * Delegates to the existing text analysis pipeline orchestrator.
   */
  async analyzeText(
    request: TextUpgradeAnalysisRequest,
    ingestion: TextUpgradeIngestionResult,
  ): Promise<TextUpgradeAnalysisResponse | null> {
    // Import dynamically to avoid circular dependencies and ensure offscreen context
    const { runTextUpgradePipeline } = await import(
      '@/entrypoints/offscreen/text-analysis/pipeline-orchestrator'
    );

    return runTextUpgradePipeline(request, ingestion);
  }

  /**
   * Analyze image using Chrome's built-in AI
   *
   * Delegates to the existing image analysis pipeline orchestrator.
   */
  async analyzeImage(
    request: ImageUpgradeAnalysisRequest,
    ingestion: ImageIngestionResult,
  ): Promise<ImageUpgradeAnalysisResponse | null> {
    // Import dynamically to avoid circular dependencies and ensure offscreen context
    const { runImageUpgradePipeline } = await import(
      '@/entrypoints/offscreen/image-analysis/pipeline-orchestrator'
    );

    return runImageUpgradePipeline(request, ingestion);
  }

  /**
   * Analyze PDF using Chrome's built-in AI
   *
   * Note: PDF analysis requires page extraction which happens in the handler.
   * This method is not directly used; PDFs go through the full handler flow.
   */
  async analyzePdf(
    _request: PdfUpgradeAnalysisRequest,
  ): Promise<ImageUpgradeAnalysisResponse | null> {
    // PDF analysis is handled differently - extraction happens in handler,
    // then runPdfUpgradePipeline is called with extracted pages.
    // The router integration happens at the handler level, not here.
    return null;
  }
}
