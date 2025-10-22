import { Chip } from '@heroui/chip';
import type { HistoryItem } from '@/entrypoints/shared/history/types';
import { IconSparkles } from '@/entrypoints/shared/ui/icons';
import type { HistoryFilter } from '../hooks/useHistory';

interface HistoryTabProps {
  historyFilter: HistoryFilter;
  onFilterChange: (filter: HistoryFilter) => void;
  filteredHistory: HistoryItem[];
}

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
            className="p-2 bg-content1 rounded-md border border-divider"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="font-medium text-foreground flex-1 break-all">
                {item.final}
              </span>
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

            {item.upgrade && (
              <div className="mt-2 p-2 bg-primary-50 dark:bg-primary-100/10 rounded-md border border-primary-200/50 dark:border-primary-400/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <IconSparkles className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  <span className="text-primary-700 dark:text-primary-300 font-medium text-[11px]">
                    Upgrade available
                  </span>
                </div>
                <p className="text-foreground dark:text-foreground/90 break-all text-[11px] leading-relaxed">
                  {item.upgrade.proposedFilename}
                </p>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {item.upgrade.reasonTags.map((tag) => (
                    <Chip
                      key={tag}
                      size="sm"
                      variant="flat"
                      color="primary"
                      className="text-[9px] h-4"
                    >
                      {tag}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            {item.media &&
              item.media.status === 'success' &&
              item.media.summary && (
                <div className="mt-1 text-[10px] text-default-500">
                  {item.media.summary.video[0] && (
                    <span>
                      {item.media.summary.video[0].width}×
                      {item.media.summary.video[0].height}
                      {item.media.summary.video[0].frameRate &&
                        ` • ${Math.round(item.media.summary.video[0].frameRate)}fps`}
                    </span>
                  )}
                  {item.media.summary.audio[0] && (
                    <span>
                      {item.media.summary.audio[0].channels && (
                        <> • {item.media.summary.audio[0].channels}ch</>
                      )}
                      {item.media.summary.audio[0].sampleRateHz && (
                        <>
                          {' '}
                          •{' '}
                          {Math.round(
                            item.media.summary.audio[0].sampleRateHz / 1000,
                          )}
                          kHz
                        </>
                      )}
                    </span>
                  )}
                  {item.media.summary.general.durationMs && (
                    <span>
                      {' '}
                      •{' '}
                      {Math.round(item.media.summary.general.durationMs / 1000)}
                      s
                    </span>
                  )}
                </div>
              )}
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
