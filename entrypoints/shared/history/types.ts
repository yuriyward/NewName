/**
 * Type definitions for history items and metadata
 */
import type { MediaMetadataSummary } from '@/entrypoints/shared/integrations/mediainfo/media-summary';
import type { InstantBaselineDecision } from '@/entrypoints/shared/pipeline/instant-baseline-types';
import type { FileType } from '@/entrypoints/shared/settings/settings';

export interface UpgradeProposal {
  proposedFilename: string;
  proposedPath: string;
  confidence: 'high' | 'suggested' | 'alternative';
  reasonTags: string[];
  generatedAt: number;
}

export interface PendingAnalysisRename {
  currentPath: string;
  currentName: string;
  targetName: string;
  scheduledAt: number;
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
  decision?: InstantBaselineDecision;
  media?: HistoryMediaMetadata;
  upgrade?: UpgradeProposal;
  pendingAnalysisRename?: PendingAnalysisRename;
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

export const MAX_PENDING_ANALYSIS_AGE_MS = 24 * 60 * 60 * 1_000; // 24 hours
