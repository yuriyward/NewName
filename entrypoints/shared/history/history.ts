/**
 * File renaming action history tracking and storage
 */
import { browser } from 'wxt/browser';
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
  phase: 1 | 2;
  reasonTags: string[];
  undone?: boolean;
}

const HISTORY_KEY = 'history.v1';
const MAX_ITEMS = getHistoryMax();
const MAX_HISTORY_AGE_MS = 1000 * 60 * 60 * 24 * 90; // 90 days

function isHistorySource(value: unknown): value is HistoryItem['source'] {
  return value === 'on-device' || value === 'cloud' || value === 'metadata';
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === 'string')
  );
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
    (maybe.phase !== 1 && maybe.phase !== 2) ||
    !isHistorySource(maybe.source) ||
    !isFileType(maybe.fileType) ||
    !isStringArray(maybe.reasonTags)
  ) {
    return false;
  }
  if (maybe.undone !== undefined && typeof maybe.undone !== 'boolean') {
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

export async function listHistory(): Promise<HistoryItem[]> {
  return readHistory();
}

export async function clearHistory(): Promise<void> {
  await browser.storage.local.remove(HISTORY_KEY);
}
