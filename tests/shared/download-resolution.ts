import path from 'node:path';
import type { BrowserContext, Download } from '@playwright/test';
import type { HistoryItem } from '@/entrypoints/shared/history/types';
import {
  waitForFinalFilenameFromExtension,
  waitForHistoryEntry,
} from '../e2e/extension.fixtures';

export interface ResolveFinalNameOptions {
  context: BrowserContext;
  download: Download;
  historyPredicate: (item: HistoryItem) => boolean;
  timeoutMs?: number;
}

export async function resolveFinalName({
  context,
  download,
  historyPredicate,
  timeoutMs = 300,
}: ResolveFinalNameOptions): Promise<string> {
  const history = await waitForHistoryEntry(
    context,
    historyPredicate,
    timeoutMs,
  ).catch(() => null);
  if (history?.final) {
    return history.final;
  }

  const finalPath = await waitForFinalFilenameFromExtension(
    context,
    download.url(),
    timeoutMs,
  ).catch(() => null);

  if (finalPath) {
    const candidate = path.basename(finalPath);
    if (/\.[a-z0-9]{1,8}$/i.test(candidate)) {
      return candidate;
    }
  }

  return download.suggestedFilename();
}
