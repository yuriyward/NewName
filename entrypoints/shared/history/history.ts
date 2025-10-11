/**
 * File renaming action history tracking and storage orchestration.
 * Keeps the public API focused while storage and validation live in dedicated modules.
 */
import {
  readHistory,
  writeHistory,
} from '@/entrypoints/shared/history/storage';
import type { HistoryItem } from '@/entrypoints/shared/history/types';
import { isValidHistoryItem } from '@/entrypoints/shared/history/validation';

export async function addHistoryItem(item: HistoryItem): Promise<void> {
  if (!isValidHistoryItem(item)) {
    throw new Error('Attempted to add invalid history item');
  }
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

export async function getHistoryItem(id: string): Promise<HistoryItem | null> {
  const history = await readHistory();
  return history.find((item) => item.id === id) ?? null;
}
