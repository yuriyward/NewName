/**
 * Type definitions for history items and metadata
 */
import type { MediaMetadataSummary } from '@/entrypoints/shared/integrations/mediainfo/media-summary';
import type { InstantBaselineDecision } from '@/entrypoints/shared/pipeline/instant-baseline-types';
import type { FileType } from '@/entrypoints/shared/settings/settings';
import type { PageContextDetails } from '@/entrypoints/shared/state/page-context-store';

export type UpgradeProposalSource = 'ai' | 'metadata';

export interface UpgradeProposal {
  proposedFilename: string;
  proposedPath: string;
  /**
   * Numeric confidence score from AI analysis (0-1 range).
   * Three-tier system:
   * - >= 0.8: Silent rename (no confirmation, shows completion notification)
   * - >= 0.5: Auto-apply with countdown (10s to review/cancel)
   * - < 0.5: Manual confirmation required (no auto-apply)
   */
  confidenceScore?: number;
  /**
   * When true, the proposal is deemed safe to apply automatically without additional user review.
   * Useful for deterministic metadata upgrades or very high-confidence AI results.
   */
  autoApply: boolean;
  /**
   * Machine-readable reason tags backing up the proposal (displayed in confirmations/history).
   */
  reasonTags: string[];
  generatedAt: number;
  /** Describes whether the rename comes from deterministic metadata enrichment or AI analysis. */
  source: UpgradeProposalSource;
  /** Optional natural language summary for UI surfaces. */
  summary?: string;
}

export interface PendingUpgradeAnalysis {
  downloadId: number;
  scheduledAt: number;
  reason: 'mock-delayed-upgrade';
}

export interface HistoryItem {
  id: string;
  ts: number;
  path: string;
  original: string;
  final: string;
  source: 'on-device' | 'cloud' | 'metadata';
  fileType: FileType;
  phase: 'instant-baseline' | 'contextual-upgrade';
  reasonTags: string[];
  undone?: boolean;
  downloadId?: number;
  decision?: InstantBaselineDecision;
  media?: HistoryMediaMetadata;
  image?: HistoryImageAnalysis;
  upgrade?: UpgradeProposal;
  pendingUpgradeAnalysis?: PendingUpgradeAnalysis;
  /** Page context captured at download time (title, heading, URL) */
  pageContext?: PageContextDetails;
}

export interface HistoryMediaMetadata {
  status: 'success' | 'error';
  analyzedAt: number;
  requestId: string;
  url: string;
  downloadId?: string;
  summary?: MediaMetadataSummary;
  metrics: {
    bytesFetched: number;
    requests: number;
    elapsedMs: number;
    fileSize?: number;
    chunkSize?: number;
  };
  error?: string;
  details?: string;
}

export interface HistoryImageAnalysis {
  status: 'success' | 'error';
  analyzedAt: number;
  description: string;
  originalWidth: number;
  originalHeight: number;
  resizedWidth: number;
  resizedHeight: number;
  resizeRatio: number;
  decisionConfidence?: number;
  metrics: {
    bytesFetched: number;
    promptCalls: number;
    elapsedMs: number;
  };
  error?: string;
}

export const MAX_PENDING_ANALYSIS_AGE_MS = 24 * 60 * 60 * 1_000; // 24 hours
