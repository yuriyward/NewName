/**
 * Smart AI Router
 *
 * Routes analysis requests to the appropriate provider (local or cloud)
 * based on user preferences, provider availability, and fallback logic.
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

    console.log('[AiRouter] Provider availability', {
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
      const result = await provider.analyzeText(request, ingestion);

      // If local failed and we can fall back to cloud, try cloud
      if (
        !result &&
        mode === 'auto' &&
        provider.type === 'local' &&
        wasFallback === false
      ) {
        console.log(
          '[AiRouter] Local analysis returned null, trying cloud fallback',
        );
        const cloudSelection = await this.selectProvider('cloud');
        if (cloudSelection) {
          return cloudSelection.provider.analyzeText(request, ingestion);
        }
      }

      return result;
    } catch (error) {
      console.error('[AiRouter] Text analysis failed', {
        error,
        provider: provider.type,
      });

      // If local failed and we can fall back to cloud, try cloud
      if (mode === 'auto' && provider.type === 'local') {
        console.log('[AiRouter] Local failed, trying cloud fallback');
        const cloudSelection = await this.selectProvider('cloud');
        if (cloudSelection) {
          try {
            return await cloudSelection.provider.analyzeText(
              request,
              ingestion,
            );
          } catch (cloudError) {
            console.error('[AiRouter] Cloud fallback also failed', {
              cloudError,
            });
          }
        }
      }

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
      const result = await provider.analyzeImage(request, ingestion);

      // If local failed and we can fall back to cloud, try cloud
      if (
        !result &&
        mode === 'auto' &&
        provider.type === 'local' &&
        wasFallback === false
      ) {
        console.log(
          '[AiRouter] Local image analysis returned null, trying cloud fallback',
        );
        const cloudSelection = await this.selectProvider('cloud');
        if (cloudSelection) {
          return cloudSelection.provider.analyzeImage(request, ingestion);
        }
      }

      return result;
    } catch (error) {
      console.error('[AiRouter] Image analysis failed', {
        error,
        provider: provider.type,
      });

      // If local failed and we can fall back to cloud, try cloud
      if (mode === 'auto' && provider.type === 'local') {
        console.log('[AiRouter] Local failed, trying cloud fallback');
        const cloudSelection = await this.selectProvider('cloud');
        if (cloudSelection) {
          try {
            return await cloudSelection.provider.analyzeImage(
              request,
              ingestion,
            );
          } catch (cloudError) {
            console.error('[AiRouter] Cloud fallback also failed', {
              cloudError,
            });
          }
        }
      }

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
    });

    try {
      const result = await provider.analyzePdf(request);

      // If local failed and we can fall back to cloud, try cloud
      if (
        !result &&
        mode === 'auto' &&
        provider.type === 'local' &&
        wasFallback === false
      ) {
        console.log(
          '[AiRouter] Local PDF analysis returned null, trying cloud fallback',
        );
        const cloudSelection = await this.selectProvider('cloud');
        if (cloudSelection) {
          return cloudSelection.provider.analyzePdf(request);
        }
      }

      return result;
    } catch (error) {
      console.error('[AiRouter] PDF analysis failed', {
        error,
        provider: provider.type,
      });

      // If local failed and we can fall back to cloud, try cloud
      if (mode === 'auto' && provider.type === 'local') {
        console.log('[AiRouter] Local failed, trying cloud fallback');
        const cloudSelection = await this.selectProvider('cloud');
        if (cloudSelection) {
          try {
            return await cloudSelection.provider.analyzePdf(request);
          } catch (cloudError) {
            console.error('[AiRouter] Cloud fallback also failed', {
              cloudError,
            });
          }
        }
      }

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
