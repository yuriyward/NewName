import type { HistoryItem } from '@/entrypoints/shared/history/types';
import type { Settings } from '@/entrypoints/shared/settings/settings';

const UPGRADE_RECENT_WINDOW_MS = 15 * 60 * 1_000;

export function shouldAnalyzeUpgrade(
  historyItem: HistoryItem,
  settings: Settings,
  now: number,
): boolean {
  if (settings.perType[historyItem.fileType]?.behavior === 'off') {
    return false;
  }

  if (
    historyItem.decision?.outcome === 'rename' &&
    historyItem.decision.confidence === 100
  ) {
    return false;
  }

  if (historyItem.upgrade) {
    const age = now - historyItem.upgrade.generatedAt;
    if (age < UPGRADE_RECENT_WINDOW_MS) {
      return false;
    }
  }

  return true;
}

export { UPGRADE_RECENT_WINDOW_MS };
