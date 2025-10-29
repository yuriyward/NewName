/**
 * Cloud AI Adapter
 *
 * Integrates with cloud AI services (Google Gemini) via ai-sdk.
 * Provides fallback/alternative to local Chrome AI processing.
 *
 * This adapter delegates to specialized analysis pipelines:
 * - Text: cloud-text-analysis.ts
 * - Image: cloud-image-analysis.ts
 * - PDF: cloud-pdf-analysis.ts
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
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
import type { CloudModel } from '@/entrypoints/shared/settings/types';
import { analyzeImageWithGemini } from './cloud-image-analysis';
import { analyzePdfWithGemini } from './cloud-pdf-analysis';
import { analyzeTextWithGemini } from './cloud-text-analysis';
import type { IAiProvider } from './types';

/**
 * Cloud AI provider using Google Gemini via ai-sdk
 *
 * Sends prepared data (text snippets, downscaled images) to Gemini API.
 * Never sends raw files to maintain data minimization principles.
 */
export class CloudAiAdapter implements IAiProvider {
  readonly type = 'cloud' as const;
  private apiKey: string | null = null;
  private modelId: CloudModel = 'gemini-flash-lite-latest';

  /**
   * Set the API key for cloud requests
   * @param apiKey - Google Gemini API key
   */
  setApiKey(apiKey: string | null): void {
    this.apiKey = apiKey;
  }

  /**
   * Set the model to use for cloud requests
   * @param modelId - Model identifier (e.g., 'gemini-flash-lite-latest')
   */
  setModel(modelId: CloudModel): void {
    this.modelId = modelId;
  }

  /**
   * Check if cloud AI is available (API key configured)
   */
  async isAvailable(): Promise<boolean> {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  /**
   * Get configured Google provider instance
   */
  private getProvider() {
    if (!this.apiKey) {
      throw new Error('Cloud AI API key not configured');
    }

    return createGoogleGenerativeAI({
      apiKey: this.apiKey,
    });
  }

  /**
   * Analyze text using Google Gemini
   *
   * Delegates to cloud-text-analysis pipeline.
   */
  async analyzeText(
    request: TextUpgradeAnalysisRequest,
    ingestion: TextUpgradeIngestionResult,
  ): Promise<TextUpgradeAnalysisResponse | null> {
    const google = this.getProvider();
    const model = google(this.modelId);
    return analyzeTextWithGemini(model, request, ingestion);
  }

  /**
   * Analyze image using Google Gemini
   *
   * Delegates to cloud-image-analysis pipeline.
   */
  async analyzeImage(
    request: ImageUpgradeAnalysisRequest,
    ingestion: ImageIngestionResult,
  ): Promise<ImageUpgradeAnalysisResponse | null> {
    const google = this.getProvider();
    const model = google(this.modelId);
    return analyzeImageWithGemini(model, request, ingestion);
  }

  /**
   * Analyze PDF using Google Gemini
   *
   * Delegates to cloud-pdf-analysis pipeline.
   */
  async analyzePdf(
    request: PdfUpgradeAnalysisRequest,
    pages: RenderedPdfPage[],
  ): Promise<ImageUpgradeAnalysisResponse | null> {
    const google = this.getProvider();
    const model = google(this.modelId);
    return analyzePdfWithGemini(model, request, pages);
  }
}
