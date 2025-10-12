import { browser } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type {
  HistoryItem,
  UpgradeProposal,
} from '@/entrypoints/shared/history/types';
import type { BrowserDownloadItem } from './types';

export type ResolveDownloadFailureReason =
  | 'not-found'
  | 'permission-denied'
  | 'invalid-payload'
  | 'unexpected-error';

export type ResolveDownloadResult =
  | { status: 'success'; downloadItem: BrowserDownloadItem }
  | {
      status: 'failure';
      reason: ResolveDownloadFailureReason;
      error?: unknown;
    };

export interface ResolveDownloadItemContext {
  historyId?: HistoryItem['id'];
  historyPath?: HistoryItem['path'];
  historyPhase?: HistoryItem['phase'];
  historySource?: HistoryItem['source'];
  pendingReason?: string;
  [key: string]: unknown;
}

export function normaliseDownloadItem(
  item: unknown,
): BrowserDownloadItem | null {
  if (!isPlainRecord(item)) {
    return null;
  }

  const id = extractNumber(item.id);
  const filename =
    typeof item.filename === 'string' ? item.filename : undefined;
  const totalBytes = extractNumber(item.totalBytes);
  const rawBytesReceived = extractNumber(item.bytesReceived);
  const state = typeof item.state === 'string' ? item.state : undefined;
  const url = typeof item.url === 'string' ? item.url : undefined;

  if (id === undefined) {
    return null;
  }

  const bytesReceived = rawBytesReceived ?? 0;

  return {
    id,
    filename,
    totalBytes,
    bytesReceived,
    state,
    url,
  };
}

export function normalizeProposal(
  proposal: UpgradeProposal,
  now: number,
): UpgradeProposal {
  return {
    proposedFilename: proposal.proposedFilename,
    proposedPath: proposal.proposedPath,
    confidence: proposal.confidence,
    autoApply: proposal.autoApply ?? false,
    reasonTags: proposal.reasonTags ?? [],
    generatedAt: proposal.generatedAt ?? now,
    source: proposal.source ?? 'ai',
    summary: proposal.summary,
  };
}

export async function resolveDownloadItem(
  downloadId: number,
  context?: ResolveDownloadItemContext,
): Promise<ResolveDownloadResult> {
  const baseLogContext = createLogContext(downloadId, context);
  try {
    const [raw] = await browser.downloads.search({ id: downloadId });
    if (!raw) {
      debugLogger.warn(
        '[UpgradeNormalization] Download item not found',
        withReason(baseLogContext, 'not-found'),
      );
      return { status: 'failure', reason: 'not-found' };
    }

    const downloadItem = normaliseDownloadItem(raw);
    if (!downloadItem) {
      const error = new Error('Download item payload missing required fields');
      debugLogger.error(
        '[UpgradeNormalization] Download item payload invalid',
        withReason(baseLogContext, 'invalid-payload', error),
      );
      return {
        status: 'failure',
        reason: 'invalid-payload',
        error,
      };
    }

    return { status: 'success', downloadItem };
  } catch (error) {
    const reason = isPermissionDenied(error)
      ? 'permission-denied'
      : 'unexpected-error';

    debugLogger.warn(
      '[UpgradeNormalization] Failed to resolve download item',
      withReason(baseLogContext, reason, error),
    );

    return { status: 'failure', reason, error };
  }
}

function extractNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function isPlainRecord(
  value: unknown,
): value is Record<string | number | symbol, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPermissionDenied(error: unknown): boolean {
  if (typeof error === 'object' && error && 'message' in error) {
    const message = String(
      (error as { message?: unknown }).message,
    ).toLowerCase();
    return message.includes('permission') || message.includes('denied');
  }

  return false;
}

function createLogContext(
  downloadId: number,
  context?: ResolveDownloadItemContext,
): Record<string, unknown> {
  if (!context) {
    return { downloadId };
  }
  return {
    downloadId,
    ...context,
  };
}

function withReason(
  base: Record<string, unknown>,
  reason: ResolveDownloadFailureReason,
  error?: unknown,
): Record<string, unknown> {
  if (error) {
    return {
      ...base,
      reason,
      error,
    };
  }
  return {
    ...base,
    reason,
  };
}
