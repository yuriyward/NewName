import { useCallback, useEffect, useMemo, useState } from 'react';
import { browser } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { getHistory } from '@/entrypoints/shared/history/history';
import { HISTORY_STORAGE_KEY } from '@/entrypoints/shared/history/storage';
import type { HistoryItem } from '@/entrypoints/shared/history/types';
import type { FileType } from '@/entrypoints/shared/settings/types';

export type HistoryFilter = 'all' | FileType;

interface UseHistoryResult {
  history: HistoryItem[];
  historyLoaded: boolean;
  historyFilter: HistoryFilter;
  setHistoryFilter: (filter: HistoryFilter) => void;
  filteredHistory: HistoryItem[];
  loadHistory: () => Promise<void>;
  upgradeCount: number;
  fileTypeCounts: Partial<Record<FileType, number>>;
}

export const useHistory = (): UseHistoryResult => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');

  const loadHistory = useCallback(async () => {
    try {
      const items = await getHistory();
      setHistory(items);
      setHistoryLoaded(true);
    } catch (err) {
      debugLogger.error('Failed to load history', { error: err });
    }
  }, []);

  useEffect(() => {
    const handleHistoryChange: Parameters<
      typeof browser.storage.onChanged.addListener
    >[0] = (changes, areaName) => {
      if (areaName !== 'local') return;
      if (!(HISTORY_STORAGE_KEY in changes)) return;
      void loadHistory();
    };

    browser.storage.onChanged.addListener(handleHistoryChange);
    return () => browser.storage.onChanged.removeListener(handleHistoryChange);
  }, [loadHistory]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') {
      return history;
    }
    return history.filter((item) => item.fileType === historyFilter);
  }, [history, historyFilter]);

  const upgradeCount = useMemo(
    () => history.filter((item) => item.upgrade).length,
    [history],
  );

  const fileTypeCounts = useMemo(() => {
    const counts: Partial<Record<FileType, number>> = {};
    for (const item of history) {
      counts[item.fileType] = (counts[item.fileType] || 0) + 1;
    }
    return counts;
  }, [history]);

  return {
    history,
    historyLoaded,
    historyFilter,
    setHistoryFilter,
    filteredHistory,
    loadHistory,
    upgradeCount,
    fileTypeCounts,
  };
};
