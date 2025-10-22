import { useCallback, useMemo, useState } from 'react';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { getHistory } from '@/entrypoints/shared/history/history';
import type { HistoryItem } from '@/entrypoints/shared/history/types';

export type HistoryFilter = 'all' | 'upgrades' | 'media';

interface UseHistoryResult {
  history: HistoryItem[];
  historyLoaded: boolean;
  historyFilter: HistoryFilter;
  setHistoryFilter: (filter: HistoryFilter) => void;
  filteredHistory: HistoryItem[];
  loadHistory: () => Promise<void>;
  upgradeCount: number;
}

export const useHistory = (): UseHistoryResult => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');

  const loadHistory = useCallback(async () => {
    if (historyLoaded) return;
    try {
      const items = await getHistory();
      setHistory(items);
      setHistoryLoaded(true);
    } catch (err) {
      debugLogger.error('Failed to load history', { error: err });
    }
  }, [historyLoaded]);

  const filteredHistory = useMemo(() => {
    switch (historyFilter) {
      case 'upgrades':
        return history.filter((item) => item.upgrade);
      case 'media':
        return history.filter(
          (item) => item.fileType === 'audio' || item.fileType === 'video',
        );
      default:
        return history;
    }
  }, [history, historyFilter]);

  const upgradeCount = useMemo(
    () => history.filter((item) => item.upgrade).length,
    [history],
  );

  return {
    history,
    historyLoaded,
    historyFilter,
    setHistoryFilter,
    filteredHistory,
    loadHistory,
    upgradeCount,
  };
};
