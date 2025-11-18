import type { UpgradeProposal } from '@/entrypoints/shared/history/types';
import type { BaseKeepBaselineResult } from '@/entrypoints/shared/integrations/ai-provider/types';
import type { InstantBaselineDecision } from '@/entrypoints/shared/pipeline/instant-baseline-types';
import type {
  FileType,
  Settings,
} from '@/entrypoints/shared/settings/settings';
import type { PageContextDetails } from '@/entrypoints/shared/state/page-context-store';
import type { TextEncoding } from '@/entrypoints/shared/utils/encoding';

export type TextAnalysisMode =
  | 'off'
  | 'on-device-only'
  | 'hybrid-ask'
  | 'hybrid-always';

export type TextUpgradeModelSource = 'on-device' | 'cloud';

export interface TextUpgradeAnalysisRequest {
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
  /** Page context captured at download time (title, heading, URL) */
  pageContext?: PageContextDetails;
  settings: {
    languagePreference: Settings['language'];
    mode: TextAnalysisMode;
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
}

export interface TextUpgradeAnalysisSuccess {
  status: 'success';
  requestId: string;
  analyzedAt: number;
  proposal: UpgradeProposal;
  summary?: string;
  language?: string;
  languageConfidence?: number;
  modelSource: TextUpgradeModelSource;
  truncatedInput?: boolean;
  promptConfidence?: number;
  promptUsed?: boolean;
  decisionReason?: string; // Why we decided to rename (from rename-decision module)
  metrics?: {
    bytesFetched: number;
    requests: number;
    elapsedMs: number;
    promptCalls?: number; // Number of Prompt API calls made (decision + generation)
    decisionConfidence?: number; // Confidence from the rename decision
  };
}

export interface TextUpgradeAnalysisKeepBaseline
  extends BaseKeepBaselineResult {
  modelSource: TextUpgradeModelSource;
  language?: string;
  languageConfidence?: number;
  decisionReason?: string;
}

export interface TextUpgradeIngestionResult {
  status: 'ingested';
  requestId: string;
  analyzedAt: number;
  text: string;
  encoding: TextEncoding;
  originalLength: number;
  truncated: boolean;
  sizeBytes?: number;
  metrics: {
    readBytes: number;
    elapsedMs: number;
  };
}

export interface TextUpgradeAnalysisUnavailable {
  status: 'unavailable';
  requestId: string;
  analyzedAt: number;
  reason:
    | 'feature-disabled'
    | 'api-unavailable'
    | 'unsupported-platform'
    | 'permissions-denied';
  message?: string;
}

export interface TextUpgradeAnalysisSkipped {
  status: 'skipped';
  requestId: string;
  analyzedAt: number;
  reason: 'empty-content' | 'file-too-large' | 'unsupported-type';
  message?: string;
}

export interface TextUpgradeAnalysisError {
  status: 'error';
  requestId: string;
  analyzedAt: number;
  error: string;
  details?: string;
}

export interface TextUpgradeAnalysisPermission {
  status: 'permission-required';
  requestId: string;
  analyzedAt: number;
  reason: 'cloud-consent-required';
  message?: string;
}

export type TextUpgradeAnalysisResponse =
  | TextUpgradeAnalysisSuccess
  | TextUpgradeAnalysisKeepBaseline
  | TextUpgradeIngestionResult
  | TextUpgradeAnalysisUnavailable
  | TextUpgradeAnalysisSkipped
  | TextUpgradeAnalysisError
  | TextUpgradeAnalysisPermission;

export type CloudConsentDecision = 'allow-once' | 'allow-always' | 'deny';

export interface CloudConsentRequestDetails {
  token: string;
  historyId: string;
  downloadId?: number;
  filename: string;
  relativePath: string;
  baselineName: string;
  requestedAt: number;
}
