import type {
  UpgradeProposal,
  UpgradeProposalSource,
} from '@/entrypoints/shared/history/types';
import type { InstantBaselineDecision } from '@/entrypoints/shared/pipeline/instant-baseline-types';
import type {
  FileType,
  Settings,
} from '@/entrypoints/shared/settings/settings';
import type { TextEncoding } from '@/entrypoints/shared/utils/encoding';

export type TextAnalysisMode = 'on-device' | 'hybrid' | 'off';

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
  settings: {
    languagePreference: Settings['language'];
    mode: TextAnalysisMode;
    maxBytes: number;
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
  modelSource: UpgradeProposalSource;
  truncatedInput?: boolean;
  metrics?: {
    bytesFetched: number;
    requests: number;
    elapsedMs: number;
  };
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

export type TextUpgradeAnalysisResponse =
  | TextUpgradeAnalysisSuccess
  | TextUpgradeIngestionResult
  | TextUpgradeAnalysisUnavailable
  | TextUpgradeAnalysisSkipped
  | TextUpgradeAnalysisError;
