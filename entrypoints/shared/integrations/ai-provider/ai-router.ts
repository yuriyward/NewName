/**
 * Smart AI Router
 *
 * Routes analysis requests to the appropriate provider (local or cloud)
 * based on user preferences, provider availability, and fallback logic.
 */

import type {
  PdfUpgradeAnalysisRequest,
  RenderedPdfPage,
} from '@/entrypoints/offscreen/pdf-analysis/types';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
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
import { CloudAiAdapter } from './cloud-adapter';
import { LocalAiAdapter } from './local-adapter';
import type { AiRouterConfig, IAiProvider, ProcessingMode } from './types';

/**
 * AI Router for selecting and coordinating between local and cloud providers
 *
 * Default strategy:
 * - 'auto': Try local first, fall back to cloud if local unavailable/fails
 * - 'local': Only use local, fail if unavailable
 * - 'cloud': Only use cloud, fail if unavailable
 */
export class AiRouter {
  private localProvider: LocalAiAdapter;
  private cloudProvider: CloudAiAdapter;
  private config: AiRouterConfig;

  constructor(config: AiRouterConfig) {
    this.config = config;
    this.localProvider = new LocalAiAdapter();
    this.cloudProvider = new CloudAiAdapter();

    // Configure cloud provider with API key and model
    if (config.cloudConfig.enabled && config.cloudConfig.apiKey) {
      this.cloudProvider.setApiKey(config.cloudConfig.apiKey);
      this.cloudProvider.setModel(config.cloudConfig.model);
    }
  }

  /**
   * Update router configuration (e.g., when settings change)
   */
  updateConfig(config: AiRouterConfig): void {
    this.config = config;

    // Update cloud provider API key and model
    if (config.cloudConfig.enabled && config.cloudConfig.apiKey) {
      this.cloudProvider.setApiKey(config.cloudConfig.apiKey);
      this.cloudProvider.setModel(config.cloudConfig.model);
    } else {
      this.cloudProvider.setApiKey(null);
    }
  }

  /**
   * Select provider based on mode and availability
   * @param mode - Processing mode preference
   * @returns Selected provider and whether it's a fallback
   */
  private async selectProvider(
    mode: ProcessingMode,
  ): Promise<{ provider: IAiProvider; wasFallback: boolean } | null> {
    const localAvailable = await this.localProvider.isAvailable();
    const cloudAvailable =
      this.config.cloudConfig.enabled &&
      this.config.cloudConfig.consentGiven &&
      (await this.cloudProvider.isAvailable());

    debugLogger.log('[AiRouter] Provider availability', {
      mode,
      localAvailable,
      cloudAvailable,
      cloudEnabled: this.config.cloudConfig.enabled,
      cloudConsent: this.config.cloudConfig.consentGiven,
    });

    switch (mode) {
      case 'local':
        // Force local only
        if (!localAvailable) {
          console.warn('[AiRouter] Local AI requested but unavailable');
          return null;
        }
        return { provider: this.localProvider, wasFallback: false };

      case 'cloud':
        // Force cloud only
        if (!cloudAvailable) {
          console.warn('[AiRouter] Cloud AI requested but unavailable');
          return null;
        }
        return { provider: this.cloudProvider, wasFallback: false };

      default:
        // Auto mode: Try local first, fall back to cloud
        if (localAvailable) {
          return { provider: this.localProvider, wasFallback: false };
        }
        if (cloudAvailable) {
          console.log(
            '[AiRouter] Falling back to cloud AI (local unavailable)',
          );
          return { provider: this.cloudProvider, wasFallback: true };
        }
        console.warn('[AiRouter] No AI providers available');
        return null;
    }
  }

  /**
   * Generic fallback handler for provider operations
   * Handles both null results and exceptions with automatic cloud fallback in auto mode
   */
  private async tryWithFallback<TRequest, TData, TResponse>(
    mode: ProcessingMode,
    provider: IAiProvider,
    wasFallback: boolean,
    operation: (
      p: IAiProvider,
      req: TRequest,
      data: TData,
    ) => Promise<TResponse | null>,
    request: TRequest,
    data: TData,
    analysisType: string,
  ): Promise<TResponse | null> {
    try {
      const result = await operation(provider, request, data);

      // If local returned null and we can fall back to cloud, try cloud
      if (
        !result &&
        mode === 'auto' &&
        provider.type === 'local' &&
        wasFallback === false
      ) {
        debugLogger.log(
          `[AiRouter] Local ${analysisType} analysis returned null, trying cloud fallback`,
        );
        const cloudSelection = await this.selectProvider('cloud');
        if (cloudSelection) {
          return operation(cloudSelection.provider, request, data);
        }
      }

      return result;
    } catch (error) {
      console.error(`[AiRouter] ${analysisType} analysis failed`, {
        error,
        provider: provider.type,
      });

      // If local failed and we can fall back to cloud, try cloud
      if (mode === 'auto' && provider.type === 'local') {
        debugLogger.log('[AiRouter] Local failed, trying cloud fallback');
        const cloudSelection = await this.selectProvider('cloud');
        if (cloudSelection) {
          try {
            return await operation(cloudSelection.provider, request, data);
          } catch (cloudError) {
            console.error('[AiRouter] Cloud fallback also failed', {
              cloudError,
            });
          }
        }
      }

      // Rethrow so caller can construct appropriate error response
      throw error;
    }
  }

  /**
   * Analyze text with automatic provider selection
   */
  async analyzeText(
    request: TextUpgradeAnalysisRequest,
    ingestion: TextUpgradeIngestionResult,
  ): Promise<TextUpgradeAnalysisResponse | null> {
    const mode = this.config.preferences.text;
    const selection = await this.selectProvider(mode);

    if (!selection) {
      console.warn('[AiRouter] No provider available for text analysis');
      return {
        status: 'unavailable',
        requestId: request.requestId,
        analyzedAt: Date.now(),
        reason: 'api-unavailable',
        message: 'No AI providers available for text analysis',
      };
    }

    const { provider, wasFallback } = selection;

    console.log('[AiRouter] Analyzing text', {
      requestId: request.requestId,
      provider: provider.type,
      wasFallback,
      mode,
    });

    try {
      return await this.tryWithFallback(
        mode,
        provider,
        wasFallback,
        (p, req, ing) => p.analyzeText(req, ing),
        request,
        ingestion,
        'text',
      );
    } catch (error) {
      return {
        status: 'error',
        requestId: request.requestId,
        analyzedAt: Date.now(),
        error: 'Text analysis failed',
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Analyze image with automatic provider selection
   */
  async analyzeImage(
    request: ImageUpgradeAnalysisRequest,
    ingestion: ImageIngestionResult,
  ): Promise<ImageUpgradeAnalysisResponse | null> {
    const mode = this.config.preferences.image;
    const selection = await this.selectProvider(mode);

    if (!selection) {
      console.warn('[AiRouter] No provider available for image analysis');
      return {
        status: 'unavailable',
        requestId: request.requestId,
        analyzedAt: Date.now(),
        reason: 'api-unavailable',
        message: 'No AI providers available for image analysis',
      };
    }

    const { provider, wasFallback } = selection;

    console.log('[AiRouter] Analyzing image', {
      requestId: request.requestId,
      provider: provider.type,
      wasFallback,
      mode,
    });

    try {
      return await this.tryWithFallback(
        mode,
        provider,
        wasFallback,
        (p, req, ing) => p.analyzeImage(req, ing),
        request,
        ingestion,
        'image',
      );
    } catch (error) {
      return {
        status: 'error',
        requestId: request.requestId,
        analyzedAt: Date.now(),
        error: 'Image analysis failed',
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Analyze PDF with automatic provider selection
   */
  async analyzePdf(
    request: PdfUpgradeAnalysisRequest,
    pages: RenderedPdfPage[],
  ): Promise<ImageUpgradeAnalysisResponse | null> {
    const mode = this.config.preferences.pdf;
    const selection = await this.selectProvider(mode);

    if (!selection) {
      console.warn('[AiRouter] No provider available for PDF analysis');
      return {
        status: 'unavailable',
        requestId: request.requestId,
        analyzedAt: Date.now(),
        reason: 'api-unavailable',
        message: 'No AI providers available for PDF analysis',
      };
    }

    const { provider, wasFallback } = selection;

    console.log('[AiRouter] Analyzing PDF', {
      requestId: request.requestId,
      provider: provider.type,
      wasFallback,
      mode,
      pageCount: pages.length,
    });

    try {
      return await this.tryWithFallback(
        mode,
        provider,
        wasFallback,
        (p, req, pgs) => p.analyzePdf(req, pgs),
        request,
        pages,
        'PDF',
      );
    } catch (error) {
      return {
        status: 'error',
        requestId: request.requestId,
        analyzedAt: Date.now(),
        error: 'PDF analysis failed',
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
