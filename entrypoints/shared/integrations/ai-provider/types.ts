/**
 * AI Provider Abstraction Layer
 *
 * This module defines a unified interface for AI providers (local Chrome AI vs. cloud services).
 * Allows seamless switching between on-device and cloud-based processing.
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
import type { CloudModel } from '@/entrypoints/shared/settings/types';

/**
 * Provider type identifier
 */
export type AiProviderType = 'local' | 'cloud';

/**
 * Processing mode preference (per file type)
 */
export type ProcessingMode = 'auto' | 'local' | 'cloud';

/**
 * Metadata about the provider used for a specific analysis
 */
export interface ProviderMetadata {
  /** Provider that handled the request */
  provider: AiProviderType;
  /** Model identifier (e.g., 'gemini-nano', 'gemini-2.5-flash') */
  model: string;
  /** Whether request was fallback from primary choice */
  wasFallback: boolean;
  /** Optional cost/usage tracking */
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    estimatedCost?: number;
  };
}

/**
 * Analysis result with provider metadata
 */
export interface AiAnalysisResult<T> {
  result: T;
  metadata: ProviderMetadata;
}

/**
 * Unified AI provider interface
 *
 * Each provider (local or cloud) implements this interface to provide
 * consistent text, image, and PDF analysis capabilities.
 */
export interface IAiProvider {
  /**
   * Provider identifier
   */
  readonly type: AiProviderType;

  /**
   * Check if this provider is currently available
   * @returns true if provider can handle requests
   */
  isAvailable(): Promise<boolean>;

  /**
   * Analyze text content and generate upgrade proposal
   * @param request - Text analysis request with file metadata
   * @param ingestion - Ingested text content
   * @returns Analysis response or null if no upgrade needed
   */
  analyzeText(
    request: TextUpgradeAnalysisRequest,
    ingestion: TextUpgradeIngestionResult,
  ): Promise<TextUpgradeAnalysisResponse | null>;

  /**
   * Analyze image content and generate upgrade proposal
   * @param request - Image analysis request with file metadata
   * @param ingestion - Ingested image data
   * @returns Analysis response or null if no upgrade needed
   */
  analyzeImage(
    request: ImageUpgradeAnalysisRequest,
    ingestion: ImageIngestionResult,
  ): Promise<ImageUpgradeAnalysisResponse | null>;

  /**
   * Analyze PDF content and generate upgrade proposal
   * @param request - PDF analysis request with file metadata
   * @param pages - Extracted PDF pages as PNG blobs
   * @returns Analysis response or null if no upgrade needed
   */
  analyzePdf(
    request: PdfUpgradeAnalysisRequest,
    pages: RenderedPdfPage[],
  ): Promise<ImageUpgradeAnalysisResponse | null>;
}

/**
 * Configuration for cloud AI provider
 */
export interface CloudProviderConfig {
  /** Whether cloud processing is enabled */
  enabled: boolean;
  /** API key for the cloud service */
  apiKey: string | null;
  /** Cloud model identifier (e.g., 'gemini-flash-lite-latest') */
  model: CloudModel;
  /** Whether user has given consent for cloud processing */
  consentGiven: boolean;
  /** Timestamp when consent was given */
  consentTimestamp: number | null;
}

/**
 * Processing preferences per file type
 */
export interface ProcessingPreferences {
  text: ProcessingMode;
  pdf: ProcessingMode;
  image: ProcessingMode;
}

/**
 * Router configuration for AI provider selection
 */
export interface AiRouterConfig {
  /** Cloud provider configuration */
  cloudConfig: CloudProviderConfig;
  /** Per-type processing preferences */
  preferences: ProcessingPreferences;
}
