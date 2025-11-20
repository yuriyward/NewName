import { useEffect, useState } from 'react';
import type { HistoryItem } from '@/entrypoints/shared/history/types';
import type { FileType } from '@/entrypoints/shared/settings/types';
import type { HistoryFilter } from '../hooks/useHistory';
import { useManagedFolderPath } from '../hooks/useManagedFolderPath';
import { EmptyStateMessage } from './HistoryTab/EmptyStateMessage';
import { HistoryFilterButton } from './HistoryTab/HistoryFilterButton';
import { HistoryItem as HistoryItemComponent } from './HistoryTab/HistoryItem';

/**
 * Maximum number of history items to display at once.
 * Limits UI rendering for performance and UX.
 */
const MAX_VISIBLE_HISTORY_ITEMS = 20;

interface HistoryTabProps {
  historyFilter: HistoryFilter;
  onFilterChange: (filter: HistoryFilter) => void;
  filteredHistory: HistoryItem[];
  fileTypeCounts: Partial<Record<FileType, number>>;
}

const HistoryTab: React.FC<HistoryTabProps> = ({
  historyFilter,
  onFilterChange,
  filteredHistory,
  fileTypeCounts,
}) => {
  const [expandedSummaries, setExpandedSummaries] = useState<
    Record<string, boolean>
  >({});
  const [visibleCount, setVisibleCount] = useState(MAX_VISIBLE_HISTORY_ITEMS);
  const managedFolder = useManagedFolderPath();

  const toggleSummary = (id: string): void => {
    setExpandedSummaries((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const showMore = (): void => {
    setVisibleCount((prev) => prev + MAX_VISIBLE_HISTORY_ITEMS);
  };

  // Reset visible count when filter changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: historyFilter is a prop that triggers reset
  useEffect(() => {
    setVisibleCount(MAX_VISIBLE_HISTORY_ITEMS);
  }, [historyFilter]);

  const hasMore = filteredHistory.length > visibleCount;
  const displayedItems = filteredHistory.slice(0, visibleCount);

  const filterButtons: Array<{
    type: FileType;
    label: string;
  }> = [
    { type: 'image', label: 'Image' },
    { type: 'video', label: 'Video' },
    { type: 'audio', label: 'Audio' },
    { type: 'pdf', label: 'PDF' },
    { type: 'office', label: 'Document' },
    { type: 'archive', label: 'Archive' },
    { type: 'data', label: 'Data' },
  ];

  return (
    <div className="pt-3">
      <div className="flex gap-2 mb-3 flex-wrap">
        <HistoryFilterButton
          label="All"
          active={historyFilter === 'all'}
          onClick={() => onFilterChange('all')}
        />
        {filterButtons.map(
          ({ type, label }) =>
            (fileTypeCounts[type] ?? 0) > 0 && (
              <HistoryFilterButton
                key={type}
                label={label}
                active={historyFilter === type}
                onClick={() => onFilterChange(type)}
              />
            ),
        )}
      </div>

      <div className="max-h-96 overflow-y-auto space-y-2 text-xs custom-scrollbar">
        {filteredHistory.length === 0 ? (
          <EmptyStateMessage filter={historyFilter} />
        ) : (
          <>
            {displayedItems.map((item) => (
              <HistoryItemComponent
                key={item.id}
                item={item}
                managedFolder={managedFolder}
                isSummaryExpanded={Boolean(expandedSummaries[item.id])}
                onToggleSummary={() => toggleSummary(item.id)}
              />
            ))}
            {hasMore && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={showMore}
                  className="text-xs text-default-600 hover:text-default-800 underline cursor-pointer transition-colors"
                >
                  Show more ({filteredHistory.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HistoryTab;
