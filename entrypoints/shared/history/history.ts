/**
 * File renaming action history tracking and storage
 */
import { browser } from 'wxt/browser';
import type { MediaMetadataSummary } from '@/entrypoints/shared/integrations/mediainfo/media-summary';
import type { InstantBaselineDecision } from '@/entrypoints/shared/pipeline/instant-baseline-types';
import type { FileType } from '@/entrypoints/shared/settings/settings';
import {
  getHistoryMax,
  isFileType,
} from '@/entrypoints/shared/settings/settings';

export interface UpgradeProposal {
  proposedFilename: string;
  proposedPath: string;
  confidence: 'high' | 'suggested' | 'alternative';
  reasonTags: string[];
  generatedAt: number;
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

const HISTORY_KEY = 'history.v1';
const MAX_ITEMS = getHistoryMax();
const MAX_HISTORY_AGE_MS = 1000 * 60 * 60 * 24 * 90; // 90 days

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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
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

function isHistoryMediaMetadata(value: unknown): value is HistoryMediaMetadata {
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
  if (maybe.confidence !== 0 && maybe.confidence !== 100) return false;
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

function isUpgradeProposal(value: unknown): value is UpgradeProposal {
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
    maybe.confidence !== 'high' &&
    maybe.confidence !== 'suggested' &&
    maybe.confidence !== 'alternative'
  ) {
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
  return true;
}

function isValidHistoryItem(entry: unknown): entry is HistoryItem {
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
  return true;
}

function pruneHistory(items: HistoryItem[], now = Date.now()): HistoryItem[] {
  const cutoff = now - MAX_HISTORY_AGE_MS;
  return items.filter((item) => item.ts >= cutoff).slice(0, MAX_ITEMS);
}

function sanitiseHistory(items: unknown): HistoryItem[] {
  if (!Array.isArray(items)) return [];
  const now = Date.now();
  const validItems = items.filter((entry): entry is HistoryItem =>
    isValidHistoryItem(entry),
  );
  return pruneHistory(validItems, now);
}

async function readHistory(): Promise<HistoryItem[]> {
  const stored = await browser.storage.local.get(HISTORY_KEY);
  const raw = stored[HISTORY_KEY];
  return sanitiseHistory(raw);
}

async function writeHistory(items: HistoryItem[]): Promise<void> {
  const normalised = pruneHistory(items);
  await browser.storage.local.set({ [HISTORY_KEY]: normalised });
}

export async function addHistoryItem(item: HistoryItem): Promise<void> {
  const history = await readHistory();
  await writeHistory([item, ...history]);
}

export async function updateHistoryItem(
  id: string,
  apply: (item: HistoryItem) => HistoryItem | null,
): Promise<HistoryItem | null> {
  const history = await readHistory();
  const index = history.findIndex((entry) => entry.id === id);
  if (index === -1) {
    return null;
  }

  const current = history[index];
  const updated = apply(current);
  if (updated === null) {
    return null;
  }

  if (!isValidHistoryItem(updated)) {
    throw new Error('Invalid history item update');
  }

  history[index] = updated;
  await writeHistory(history);
  return updated;
}

export async function getHistory(): Promise<HistoryItem[]> {
  return readHistory();
}
