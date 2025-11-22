/**
 * Local AI Adapter
 *
 * Wraps Chrome's built-in AI (Gemini Nano) for on-device processing.
 * This adapter delegates to existing pipeline orchestrators without changing their logic.
 */

import type {
  PdfUpgradeAnalysisKeepBaseline,
  PdfUpgradeAnalysisRequest,
  RenderedPdfPage,
} from '@/entrypoints/offscreen/pdf-analysis/types';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type { UpgradeProposal } from '@/entrypoints/shared/history/types';
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
import { ensureAiModelsReadyRemote } from '@/entrypoints/shared/messaging/text-messages';
import type { IAiProvider } from './types';

/**
 * Retry helper for dynamic imports with exponential backoff
 *
 * Handles race conditions where offscreen document is initialized
 * but dynamic import system isn't fully ready yet.
 * Common on fast sites like x-kom.pl.
 */
async function retryDynamicImport<T>(
  importFn: () => Promise<T>,
  maxAttempts = 3,
  context = 'unknown',
): Promise<T> {
  const delays = [100, 200, 400]; // Exponential backoff in ms

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const startTime = performance.now();
      const result = await importFn();
      const duration = performance.now() - startTime;

      if (attempt > 0) {
        debugLogger.log(
          `[LocalAiAdapter] Dynamic import succeeded on retry ${attempt + 1}`,
          { context, duration },
        );
      }

      return result;
    } catch (error) {
      const isLastAttempt = attempt === maxAttempts - 1;

      if (isLastAttempt) {
        debugLogger.error(
          '[LocalAiAdapter] Dynamic import failed after all retries',
          { context, attempt: attempt + 1, maxAttempts, error },
        );
        throw error;
      }

      const delay = delays[attempt] || 400;
      debugLogger.warn('[LocalAiAdapter] Dynamic import failed, retrying...', {
        context,
        attempt: attempt + 1,
        delay,
        error,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Retry loop should not reach here');
}

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
   * Uses message-based approach to check availability in background context
   * because window.ai is NOT available in offscreen documents.
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if AI models are available via background context
      // window.ai is only available in service worker, not offscreen documents
      const modelStatuses = await ensureAiModelsReadyRemote({
        ids: ['language-model'],
      });

      const languageModelStatus = modelStatuses['language-model'];
      const isAvailable = languageModelStatus?.state === 'available';

      debugLogger.log('[LocalAiAdapter] Availability check via background', {
        state: languageModelStatus?.state,
        availability: languageModelStatus?.availability,
        isAvailable,
      });

      return isAvailable;
    } catch (error) {
      debugLogger.warn('[LocalAiAdapter] Availability check failed', { error });
      return false;
    }
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
    // Import dynamically with retry logic to handle race conditions
    const { runTextUpgradePipeline } = await retryDynamicImport(
      () =>
        import('@/entrypoints/offscreen/text-analysis/pipeline-orchestrator'),
      3,
      'text-analysis',
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
    // Import dynamically with retry logic to handle race conditions
    const { runImageUpgradePipeline } = await retryDynamicImport(
      () =>
        import('@/entrypoints/offscreen/image-analysis/pipeline-orchestrator'),
      3,
      'image-analysis',
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
    // Import dynamically with retry logic to handle race conditions
    const { runPdfUpgradePipeline } = await retryDynamicImport(
      () =>
        import('@/entrypoints/offscreen/pdf-analysis/pdf-analysis-pipeline'),
      3,
      'pdf-analysis',
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

    if (isKeepBaseline(proposal)) {
      return {
        status: 'keep-baseline',
        requestId: proposal.requestId,
        analyzedAt: proposal.analyzedAt,
        reason: proposal.reason,
        confidence: proposal.confidence,
        explanation: proposal.explanation,
        baselineFilename: proposal.baselineFilename,
        modelSource: 'on-device',
      };
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

function isKeepBaseline(
  value: UpgradeProposal | PdfUpgradeAnalysisKeepBaseline,
): value is PdfUpgradeAnalysisKeepBaseline {
  return typeof value === 'object' && value !== null && 'status' in value;
}
