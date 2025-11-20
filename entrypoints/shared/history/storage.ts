/**
 * History storage operations with pruning and sanitization
 */
import { browser } from 'wxt/browser';
import {
  type HistoryItem,
  MAX_PENDING_ANALYSIS_AGE_MS,
} from '@/entrypoints/shared/history/types';
import { isValidHistoryItem } from '@/entrypoints/shared/history/validation';
import { getHistoryMax } from '@/entrypoints/shared/settings/settings';

export const HISTORY_STORAGE_KEY = 'history.v1';
const MAX_ITEMS = getHistoryMax();
const MAX_HISTORY_AGE_MS = 1000 * 60 * 60 * 24 * 90; // 90 days

function clearStalePendingAnalysis(
  item: HistoryItem,
  now: number,
): HistoryItem {
  const pending = item.pendingUpgradeAnalysis;
  if (!pending) return item;
  if (now - pending.scheduledAt <= MAX_PENDING_ANALYSIS_AGE_MS) {
    return item;
  }
  return {
    ...item,
    pendingUpgradeAnalysis: undefined,
  };
}

function pruneHistory(items: HistoryItem[], now = Date.now()): HistoryItem[] {
  const cutoff = now - MAX_HISTORY_AGE_MS;
  return items.filter((item) => item.ts >= cutoff).slice(0, MAX_ITEMS);
}

function sanitiseHistory(items: unknown): HistoryItem[] {
  if (!Array.isArray(items)) return [];
  const now = Date.now();
  const validItems = items
    .filter((entry): entry is HistoryItem => isValidHistoryItem(entry))
    .map((entry) => clearStalePendingAnalysis(entry, now));
  return pruneHistory(validItems, now);
}

export async function readHistory(): Promise<HistoryItem[]> {
  const stored = await browser.storage.local.get(HISTORY_STORAGE_KEY);
  const raw = stored[HISTORY_STORAGE_KEY];
  return sanitiseHistory(raw);
}

export async function writeHistory(items: HistoryItem[]): Promise<void> {
  const normalised = pruneHistory(items);
  await browser.storage.local.set({ [HISTORY_STORAGE_KEY]: normalised });
}
