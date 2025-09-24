/**
 * File renaming action history tracking and storage
 */
import { browser } from 'wxt/browser';
import type { InstantBaselineDecision } from '@/entrypoints/shared/pipeline/instant-baseline-types';
import type { FileType } from '@/entrypoints/shared/settings/settings';
import {
  getHistoryMax,
  isFileType,
} from '@/entrypoints/shared/settings/settings';

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
