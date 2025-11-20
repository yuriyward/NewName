import type { HistoryItem } from '@/entrypoints/shared/history/types';

/**
 * Get the rename label based on the source of the rename
 */
export const getRenameLabel = (
  item: HistoryItem,
  wasRenamed: boolean,
): string => {
  if (!wasRenamed) {
    return 'Saved';
  }

  const hasAiUpgrade =
    item.upgrade?.source === 'ai' &&
    (item.phase === 'contextual-upgrade' ||
      item.reasonTags.includes('ai-text-summary') ||
      item.reasonTags.some((tag) => tag.startsWith('ai-')));

  if (hasAiUpgrade) {
    return 'Renamed with AI';
  }
  if (item.source === 'cloud') {
    return 'Renamed with Cloud AI';
  }
  if (item.source === 'on-device') {
    return 'Renamed with AI';
  }
  // metadata source
  return 'Renamed';
};
