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
import { LocalAiAdapter } from './local-adapter';
import type { AiRouterConfig, IAiProvider, ProcessingMode } from './types';

// Lazy-loaded cloud adapter to avoid loading ai-sdk (~100KB+) when not needed
type CloudAiAdapter = IAiProvider & {
  setApiKey(apiKey: string | null): void;
  setModel(modelId: string): void;
};

/**
 * AI Router for selecting and coordinating between local and cloud providers
 *
 * Default strategy:
 * - 'auto': Try local first, fall back to cloud if local unavailable/fails
 * - 'local': Only use local, fail if unavailable
 * - 'cloud': Only use cloud, fail if unavailable
 *
 * Performance: Cloud adapter (~100KB+ ai-sdk) is lazy-loaded only when needed
 */
export class AiRouter {
  private localProvider: LocalAiAdapter;
  private cloudProvider: CloudAiAdapter | null = null;
  private config: AiRouterConfig;

  constructor(config: AiRouterConfig) {
    this.config = config;
    this.localProvider = new LocalAiAdapter();
    // Note: cloudProvider is lazy-loaded in getCloudProvider()
  }

  /**
   * Lazy-load cloud adapter only when needed
   * Avoids loading ai-sdk package (~100KB+) when cloud mode is not used
   */
  private async getCloudProvider(): Promise<CloudAiAdapter> {
    if (!this.cloudProvider) {
      const { CloudAiAdapter: CloudAdapter } = await import('./cloud-adapter');
      this.cloudProvider = new CloudAdapter();

      // Configure with current settings
      if (this.config.cloudConfig.enabled && this.config.cloudConfig.apiKey) {
        this.cloudProvider.setApiKey(this.config.cloudConfig.apiKey);
        this.cloudProvider.setModel(this.config.cloudConfig.model);
      }
    }
    return this.cloudProvider;
  }

  /**
   * Update router configuration (e.g., when settings change)
   */
  updateConfig(config: AiRouterConfig): void {
    this.config = config;

    // Update cloud provider if already loaded
    if (this.cloudProvider) {
      if (config.cloudConfig.enabled && config.cloudConfig.apiKey) {
        this.cloudProvider.setApiKey(config.cloudConfig.apiKey);
        this.cloudProvider.setModel(config.cloudConfig.model);
      } else {
        this.cloudProvider.setApiKey(null);
      }
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
    // Only check local availability when needed (not for cloud-only mode)
    let localAvailable = false;
    if (mode !== 'cloud') {
      localAvailable = await this.localProvider.isAvailable();
    }

    // Only check cloud availability when needed (not for local-only mode)
    let cloudAvailable = false;
    let cloudProvider: CloudAiAdapter | null = null;
    if (
      mode !== 'local' &&
      this.config.cloudConfig.enabled &&
      this.config.cloudConfig.consentGiven
    ) {
      cloudProvider = await this.getCloudProvider();
      cloudAvailable = await cloudProvider.isAvailable();
    }

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
          debugLogger.warn('[AiRouter] Local AI requested but unavailable');
          return null;
        }
        return { provider: this.localProvider, wasFallback: false };

      case 'cloud':
        // Force cloud only
        if (!cloudAvailable || !cloudProvider) {
          debugLogger.warn('[AiRouter] Cloud AI requested but unavailable');
          return null;
        }
        return { provider: cloudProvider, wasFallback: false };

      default:
        // Auto mode: Try local first, fall back to cloud
        if (localAvailable) {
          return { provider: this.localProvider, wasFallback: false };
        }
        if (cloudAvailable && cloudProvider) {
          debugLogger.log(
            '[AiRouter] Falling back to cloud AI (local unavailable)',
          );
          return { provider: cloudProvider, wasFallback: true };
        }
        debugLogger.warn('[AiRouter] No AI providers available');
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
          try {
            return await operation(cloudSelection.provider, request, data);
          } catch (fallbackError) {
            debugLogger.error('[AiRouter] Cloud fallback failed', {
              fallbackError,
            });
            return null;
          }
        }
      }

      return result;
    } catch (error) {
      debugLogger.error(`[AiRouter] ${analysisType} analysis failed`, {
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
            debugLogger.error('[AiRouter] Cloud fallback also failed', {
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
      debugLogger.warn('[AiRouter] No provider available for text analysis');
      return {
        status: 'unavailable',
        requestId: request.requestId,
        analyzedAt: Date.now(),
        reason: 'api-unavailable',
        message: 'No AI providers available for text analysis',
      };
    }

    const { provider, wasFallback } = selection;

    debugLogger.log('[AiRouter] Analyzing text', {
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
      debugLogger.warn('[AiRouter] No provider available for image analysis');
      return {
        status: 'unavailable',
        requestId: request.requestId,
        analyzedAt: Date.now(),
        reason: 'api-unavailable',
        message: 'No AI providers available for image analysis',
      };
    }

    const { provider, wasFallback } = selection;

    debugLogger.log('[AiRouter] Analyzing image', {
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
      debugLogger.warn('[AiRouter] No provider available for PDF analysis');
      return {
        status: 'unavailable',
        requestId: request.requestId,
        analyzedAt: Date.now(),
        reason: 'api-unavailable',
        message: 'No AI providers available for PDF analysis',
      };
    }

    const { provider, wasFallback } = selection;

    debugLogger.log('[AiRouter] Analyzing PDF', {
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
