/**
 * Type definitions for image analysis upgrade pipeline
 */
import type { UpgradeProposal } from '@/entrypoints/shared/history/types';
import type { BaseKeepBaselineResult } from '@/entrypoints/shared/integrations/ai-provider/types';
import type { InstantBaselineDecision } from '@/entrypoints/shared/pipeline/instant-baseline-types';
import type {
  FileType,
  Settings,
} from '@/entrypoints/shared/settings/settings';
import type { PageContext } from '@/entrypoints/shared/state/page-context-store';

export type ImageAnalysisMode =
  | 'off'
  | 'on-device-only'
  | 'hybrid-ask'
  | 'hybrid-always';

export type ImageUpgradeModelSource = 'on-device' | 'cloud';

/**
 * Optional PDF context passed through image analysis pipeline
 * Used to prioritize PDF document titles in filename generation
 */
export interface PdfContextForImage {
  documentTitle: string | null;
  shouldPrioritizeTitle: boolean;
}

export interface ImageUpgradeAnalysisRequest {
  requestId: string;
  historyId: string;
  downloadId: number;
  url: string | null;
  filename: string;
  relativePath: string;
  mimeType: string | null;
  sizeBytes?: number;
  fileType: FileType;
  baseline: {
    original: string;
    final: string;
    decision: InstantBaselineDecision | undefined;
  };
  settings: {
    mode: ImageAnalysisMode;
    maxBytes: number;
    maxFilenameLength: Settings['maxLen'];
    separator: Settings['separator'];
    transliterateAscii: Settings['transliterateAscii'];
  };
  /**
   * Cloud AI configuration for router
   * Passed from background to avoid storage access issues in offscreen context
   */
  cloudConfig: {
    enabled: boolean;
    apiKey: string | null;
    model: Settings['cloud']['model'];
    consentGiven: boolean;
    consentTimestamp: number | null;
  };
  /**
   * Processing preferences for AI router
   * Determines whether to use local, cloud, or auto mode per file type
   */
  processingPreferences: {
    text: 'auto' | 'local' | 'cloud';
    pdf: 'auto' | 'local' | 'cloud';
    image: 'auto' | 'local' | 'cloud';
  };
  /**
   * Optional PDF context for prioritizing document titles in filename generation
   * Only set when analyzing PDF pages as images
   */
  pdfContext?: PdfContextForImage;
  /** Page context captured at download time (title, heading, URL) */
  pageContext?: Pick<PageContext, 'title' | 'heading' | 'url'>;
}

export interface ImageUpgradeAnalysisSuccess {
  status: 'success';
  requestId: string;
  analyzedAt: number;
  proposal: UpgradeProposal;
  description: string;
  language?: string;
  modelSource: ImageUpgradeModelSource;
  truncatedInput?: boolean;
  promptConfidence?: number;
  promptUsed?: boolean;
  decisionReason?: string;
  metrics?: {
    bytesFetched: number;
    requests: number;
    elapsedMs: number;
    promptCalls?: number;
    decisionConfidence?: number;
    resizeRatio?: number;
    originalWidth?: number;
    originalHeight?: number;
    resizedWidth?: number;
    resizedHeight?: number;
  };
}

export interface ImageUpgradeAnalysisKeepBaseline
  extends BaseKeepBaselineResult {
  modelSource: ImageUpgradeModelSource;
  decisionReason?: string;
  promptUsed?: boolean;
}

export interface ImageIngestionResult {
  status: 'ingested';
  requestId: string;
  analyzedAt: number;
  blob: Blob;
  mimeType: string;
  originalWidth: number;
  originalHeight: number;
  resizedWidth: number;
  resizedHeight: number;
  resizeRatio: number;
  originalSizeBytes: number;
  metrics: {
    readBytes: number;
    elapsedMs: number;
  };
}

export interface ImageUpgradeAnalysisUnavailable {
  status: 'unavailable';
  requestId: string;
  analyzedAt: number;
  reason:
    | 'feature-disabled'
    | 'api-unavailable'
    | 'unsupported-platform'
    | 'permissions-denied'
    | 'multimodal-unsupported';
  message?: string;
}

export interface ImageUpgradeAnalysisSkipped {
  status: 'skipped';
  requestId: string;
  analyzedAt: number;
  reason: 'file-too-large' | 'unsupported-type' | 'corrupt-image';
  message?: string;
}

export interface ImageUpgradeAnalysisError {
  status: 'error';
  requestId: string;
  analyzedAt: number;
  error: string;
  details?: string;
}

export type ImageUpgradeAnalysisResponse =
  | ImageUpgradeAnalysisSuccess
  | ImageUpgradeAnalysisKeepBaseline
  | ImageIngestionResult
  | ImageUpgradeAnalysisUnavailable
  | ImageUpgradeAnalysisSkipped
  | ImageUpgradeAnalysisError;
