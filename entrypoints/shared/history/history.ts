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

function sanitiseHistory(items: unknown): HistoryItem[] {
  if (!Array.isArray(items)) return [];
  return items.slice(0, MAX_ITEMS).filter((entry): entry is HistoryItem => {
    if (!entry || typeof entry !== 'object') return false;
    const maybe = entry as Partial<HistoryItem>;
    return (
      typeof maybe.id === 'string' &&
      typeof maybe.ts === 'number' &&
      typeof maybe.path === 'string' &&
      typeof maybe.original === 'string' &&
      typeof maybe.final === 'string' &&
      (maybe.phase === 1 || maybe.phase === 2) &&
      isFileType(maybe.fileType)
    );
  });
}

async function readHistory(): Promise<HistoryItem[]> {
  const stored = await browser.storage.local.get(HISTORY_KEY);
  const raw = stored[HISTORY_KEY];
  return sanitiseHistory(raw);
}

async function writeHistory(items: HistoryItem[]): Promise<void> {
  await browser.storage.local.set({ [HISTORY_KEY]: items.slice(0, MAX_ITEMS) });
}

export async function addHistoryItem(item: HistoryItem): Promise<void> {
  const history = await readHistory();
  history.unshift(item);
  if (history.length > MAX_ITEMS) {
    history.length = MAX_ITEMS;
  }
  await writeHistory(history);
}

export async function listHistory(): Promise<HistoryItem[]> {
  return readHistory();
}

export async function clearHistory(): Promise<void> {
  await browser.storage.local.remove(HISTORY_KEY);
}
