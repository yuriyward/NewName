/**
 * Runtime validation for history data integrity
 */
import type {
  HistoryItem,
  HistoryMediaMetadata,
  PendingUpgradeAnalysis,
  UpgradeProposal,
} from '@/entrypoints/shared/history/types';
import type { MediaMetadataSummary } from '@/entrypoints/shared/integrations/mediainfo/media-summary';
import type { InstantBaselineDecision } from '@/entrypoints/shared/pipeline/instant-baseline-types';
import { isFileType } from '@/entrypoints/shared/settings/settings';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isHistorySource(value: unknown): value is HistoryItem['source'] {
  return value === 'on-device' || value === 'cloud' || value === 'metadata';
}

function isHistoryPhase(value: unknown): value is HistoryItem['phase'] {
  return value === 'instant-baseline' || value === 'contextual-upgrade';
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === 'string')
  );
}

function isMediaSummary(value: unknown): value is MediaMetadataSummary {
  if (!isPlainObject(value)) return false;
  const general = (value as { general?: unknown }).general;
  if (!isPlainObject(general)) return false;
  const video = (value as { video?: unknown }).video;
  if (!Array.isArray(video)) return false;
  const audio = (value as { audio?: unknown }).audio;
  if (!Array.isArray(audio)) return false;
  return true;
}

export function isHistoryMediaMetadata(
  value: unknown,
): value is HistoryMediaMetadata {
  if (!isPlainObject(value)) return false;
  const maybe = value as Partial<HistoryMediaMetadata>;
  if (maybe.status !== 'success' && maybe.status !== 'error') return false;
  if (
    typeof maybe.analyzedAt !== 'number' ||
    !Number.isFinite(maybe.analyzedAt)
  ) {
    return false;
  }
  if (typeof maybe.requestId !== 'string' || maybe.requestId.length === 0) {
    return false;
  }
  if (typeof maybe.url !== 'string' || maybe.url.length === 0) {
    return false;
  }
  if (
    maybe.downloadId !== undefined &&
    (typeof maybe.downloadId !== 'string' || maybe.downloadId.length === 0)
  ) {
    return false;
  }
  if (!isPlainObject(maybe.metrics)) return false;
  const { bytesFetched, requests, elapsedMs, fileSize, chunkSize } =
    maybe.metrics as HistoryMediaMetadata['metrics'];
  if (!Number.isFinite(bytesFetched) || bytesFetched < 0) return false;
  if (!Number.isFinite(requests) || requests < 0) return false;
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return false;
  if (fileSize !== undefined && (!Number.isFinite(fileSize) || fileSize < 0)) {
    return false;
  }
  if (
    chunkSize !== undefined &&
    (!Number.isFinite(chunkSize) || chunkSize <= 0)
  ) {
    return false;
  }
  if (maybe.summary !== undefined && !isMediaSummary(maybe.summary)) {
    return false;
  }
  if (maybe.error !== undefined && typeof maybe.error !== 'string') {
    return false;
  }
  if (maybe.details !== undefined && typeof maybe.details !== 'string') {
    return false;
  }
  return true;
}

function isInstantBaselineDecision(
  value: unknown,
): value is InstantBaselineDecision {
  if (!value || typeof value !== 'object') return false;
  const maybe = value as Partial<InstantBaselineDecision>;
  if (maybe.outcome !== 'rename' && maybe.outcome !== 'keep') return false;
  if (
    maybe.strategy !== 'keep-original' &&
    maybe.strategy !== 'original-with-date' &&
    maybe.strategy !== 'page-title' &&
    maybe.strategy !== 'page-title-with-date'
  ) {
    return false;
  }
  if (
    maybe.confidence !== 0 &&
    maybe.confidence !== 50 &&
    maybe.confidence !== 100
  ) {
    return false;
  }
  if (
    maybe.guardrail !== 'strategy-applied' &&
    maybe.guardrail !== 'strategy-unavailable'
  ) {
    return false;
  }
  if (!Array.isArray(maybe.reasons)) return false;
  if (
    !maybe.signals ||
    typeof maybe.signals !== 'object' ||
    !Array.isArray((maybe.signals as { inputsUsed?: unknown }).inputsUsed) ||
    !Array.isArray((maybe.signals as { missingInputs?: unknown }).missingInputs)
  ) {
    return false;
  }
  return true;
}

export function isUpgradeProposal(value: unknown): value is UpgradeProposal {
  if (!isPlainObject(value)) return false;
  const maybe = value as Partial<UpgradeProposal>;
  if (
    typeof maybe.proposedFilename !== 'string' ||
    maybe.proposedFilename.length === 0
  ) {
    return false;
  }
  if (
    typeof maybe.proposedPath !== 'string' ||
    maybe.proposedPath.length === 0
  ) {
    return false;
  }
  if (
    maybe.confidenceScore !== undefined &&
    (typeof maybe.confidenceScore !== 'number' ||
      !Number.isFinite(maybe.confidenceScore) ||
      maybe.confidenceScore < 0 ||
      maybe.confidenceScore > 1)
  ) {
    return false;
  }
  if (maybe.autoApply !== undefined && typeof maybe.autoApply !== 'boolean') {
    return false;
  }
  if (!isStringArray(maybe.reasonTags)) {
    return false;
  }
  if (
    typeof maybe.generatedAt !== 'number' ||
    !Number.isFinite(maybe.generatedAt)
  ) {
    return false;
  }
  if (
    maybe.source !== undefined &&
    maybe.source !== 'ai' &&
    maybe.source !== 'metadata'
  ) {
    return false;
  }
  if (maybe.summary !== undefined && typeof maybe.summary !== 'string') {
    return false;
  }
  return true;
}

export function isPendingUpgradeAnalysis(
  value: unknown,
): value is PendingUpgradeAnalysis {
  if (!isPlainObject(value)) return false;
  const maybe = value as Partial<PendingUpgradeAnalysis>;
  if (
    typeof maybe.downloadId !== 'number' ||
    !Number.isSafeInteger(maybe.downloadId) ||
    maybe.downloadId < 0
  ) {
    return false;
  }
  if (maybe.reason !== undefined && maybe.reason !== 'mock-delayed-upgrade') {
    return false;
  }
  if (
    typeof maybe.scheduledAt !== 'number' ||
    !Number.isFinite(maybe.scheduledAt)
  ) {
    return false;
  }
  return true;
}

export function isValidHistoryItem(entry: unknown): entry is HistoryItem {
  if (!entry || typeof entry !== 'object') return false;
  const maybe = entry as Partial<HistoryItem>;
  if (
    typeof maybe.id !== 'string' ||
    typeof maybe.ts !== 'number' ||
    !Number.isFinite(maybe.ts) ||
    typeof maybe.path !== 'string' ||
    typeof maybe.original !== 'string' ||
    typeof maybe.final !== 'string' ||
    !isHistoryPhase(maybe.phase) ||
    !isHistorySource(maybe.source) ||
    !isFileType(maybe.fileType) ||
    !isStringArray(maybe.reasonTags)
  ) {
    return false;
  }
  if (maybe.undone !== undefined && typeof maybe.undone !== 'boolean') {
    return false;
  }
  if (
    maybe.downloadId !== undefined &&
    (typeof maybe.downloadId !== 'number' ||
      !Number.isSafeInteger(maybe.downloadId) ||
      maybe.downloadId < 0)
  ) {
    return false;
  }
  if (
    maybe.decision !== undefined &&
    !isInstantBaselineDecision(maybe.decision)
  ) {
    return false;
  }
  if (maybe.media !== undefined && !isHistoryMediaMetadata(maybe.media)) {
    return false;
  }
  if (maybe.upgrade !== undefined && !isUpgradeProposal(maybe.upgrade)) {
    return false;
  }
  if (
    maybe.pendingUpgradeAnalysis !== undefined &&
    !isPendingUpgradeAnalysis(maybe.pendingUpgradeAnalysis)
  ) {
    return false;
  }
  return true;
}
