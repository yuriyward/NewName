import { CheckIcon } from '@heroicons/react/16/solid';
import { Chip } from '@heroui/chip';
import type { HistoryItem } from '@/entrypoints/shared/history/types';
import { FilenameLabel } from '@/entrypoints/shared/ui/FilenameLabel';
import type { HistoryFilter } from '../hooks/useHistory';

interface HistoryTabProps {
  historyFilter: HistoryFilter;
  onFilterChange: (filter: HistoryFilter) => void;
  filteredHistory: HistoryItem[];
}

/**
 * Get the rename label based on the source of the rename
 */
const getRenameLabel = (item: HistoryItem): string => {
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

const HistoryTab = ({
  historyFilter,
  onFilterChange,
  filteredHistory,
}: HistoryTabProps) => (
  <div className="pt-3">
    <div className="flex gap-2 mb-3 flex-wrap">
      <HistoryFilterButton
        label="All"
        active={historyFilter === 'all'}
        onClick={() => onFilterChange('all')}
      />
      <HistoryFilterButton
        label="Upgrades"
        active={historyFilter === 'upgrades'}
        onClick={() => onFilterChange('upgrades')}
      />
      <HistoryFilterButton
        label="Media"
        active={historyFilter === 'media'}
        onClick={() => onFilterChange('media')}
      />
    </div>

    <div className="max-h-96 overflow-y-auto space-y-2 text-xs">
      {filteredHistory.length === 0 ? (
        <EmptyStateMessage filter={historyFilter} />
      ) : (
        filteredHistory.slice(0, 20).map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-content3 bg-content1 shadow-sm"
          >
            <div className="p-2.5 space-y-1.5">
              {/* Header with icon and file type */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <CheckIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <p className="text-xs opacity-80">{getRenameLabel(item)}</p>
                </div>
                <Chip
                  size="sm"
                  variant="flat"
                  color={
                    item.fileType === 'video' || item.fileType === 'audio'
                      ? 'secondary'
                      : 'default'
                  }
                  className="text-[10px] flex-shrink-0"
                >
                  {item.fileType}
                </Chip>
              </div>

              {/* Filename display with before/after */}
              <div className="ml-5">
                <FilenameLabel
                  originalFilename={item.original}
                  newFilename={item.final}
                  className="text-xs"
                />
              </div>

              {/* Media metadata (if available) */}
              {item.media &&
                item.media.status === 'success' &&
                item.media.summary && (
                  <div className="ml-5 text-[10px] text-default-500 flex items-center gap-1 flex-wrap">
                    {item.media.summary.video[0] && (
                      <>
                        <span>
                          {item.media.summary.video[0].width}×
                          {item.media.summary.video[0].height}
                        </span>
                        {item.media.summary.video[0].frameRate && (
                          <>
                            <span>•</span>
                            <span>
                              {Math.round(
                                item.media.summary.video[0].frameRate,
                              )}
                              fps
                            </span>
                          </>
                        )}
                      </>
                    )}
                    {item.media.summary.audio[0] && (
                      <>
                        {item.media.summary.audio[0].channels && (
                          <>
                            <span>•</span>
                            <span>
                              {item.media.summary.audio[0].channels}ch
                            </span>
                          </>
                        )}
                        {item.media.summary.audio[0].sampleRateHz && (
                          <>
                            <span>•</span>
                            <span>
                              {Math.round(
                                item.media.summary.audio[0].sampleRateHz / 1000,
                              )}
                              kHz
                            </span>
                          </>
                        )}
                      </>
                    )}
                    {item.media.summary.general.durationMs && (
                      <>
                        <span>•</span>
                        <span>
                          {Math.round(
                            item.media.summary.general.durationMs / 1000,
                          )}
                          s
                        </span>
                      </>
                    )}
                  </div>
                )}
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

export default HistoryTab;

interface HistoryFilterButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const HistoryFilterButton = ({
  label,
  active,
  onClick,
}: HistoryFilterButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-xs px-2 py-1 rounded-md transition-colors ${
      active
        ? 'bg-primary text-primary-foreground'
        : 'bg-default-100 text-default-600 hover:bg-default-200'
    }`}
  >
    {label}
  </button>
);

const EmptyStateMessage = ({ filter }: { filter: HistoryFilter }) => {
  if (filter === 'upgrades') {
    return (
      <p className="text-default-400 text-center py-4">No upgrades available</p>
    );
  }

  if (filter === 'media') {
    return (
      <p className="text-default-400 text-center py-4">No media files yet</p>
    );
  }

  return <p className="text-default-400 text-center py-4">No history yet</p>;
};
