/**
 * Local AI Adapter
 *
 * Wraps Chrome's built-in AI (Gemini Nano) for on-device processing.
 * This adapter delegates to existing pipeline orchestrators without changing their logic.
 */

import type {
  PdfUpgradeAnalysisRequest,
  RenderedPdfPage,
} from '@/entrypoints/offscreen/pdf-analysis/types';
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
   * Delegates to the existing PDF analysis pipeline orchestrator.
   * Accepts extracted pages to enable consistent router interface.
   */
  async analyzePdf(
    request: PdfUpgradeAnalysisRequest,
    pages: RenderedPdfPage[],
  ): Promise<ImageUpgradeAnalysisResponse | null> {
    // Import dynamically to avoid circular dependencies and ensure offscreen context
    const { runPdfUpgradePipeline } = await import(
      '@/entrypoints/offscreen/pdf-analysis/pdf-analysis-pipeline'
    );

    // Convert RenderedPdfPage to ExtractedPageForAnalysis format
    const extractedPages = pages.map((page) => ({
      pageNumber: page.pageNumber,
      blob: page.blob,
      width: page.width,
      height: page.height,
    }));

    const proposal = await runPdfUpgradePipeline(extractedPages, request);

    if (!proposal) {
      return null;
    }

    // Return in ImageUpgradeAnalysisResponse format
    return {
      status: 'success',
      requestId: request.requestId,
      analyzedAt: Date.now(),
      proposal,
      description: proposal.summary || '',
      modelSource: 'on-device',
      promptUsed: true,
    };
  }
}
