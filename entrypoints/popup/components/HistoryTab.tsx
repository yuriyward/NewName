import { CheckIcon } from '@heroicons/react/16/solid';
import { Chip } from '@heroui/chip';
import { useState } from 'react';
import type { HistoryItem } from '@/entrypoints/shared/history/types';
import type { FileType } from '@/entrypoints/shared/settings/types';
import { FilenameLabel } from '@/entrypoints/shared/ui/FilenameLabel';
import type { HistoryFilter } from '../hooks/useHistory';

interface HistoryTabProps {
  historyFilter: HistoryFilter;
  onFilterChange: (filter: HistoryFilter) => void;
  filteredHistory: HistoryItem[];
  fileTypeCounts: Partial<Record<FileType, number>>;
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

interface SummarySegment {
  key?: string;
  value: string;
}

function parseSummary(summary: string): SummarySegment[] {
  const segments: SummarySegment[] = [];

  summary
    .split(/\n+/)
    .flatMap((line) => line.split(/\s*\|\s*/))
    .forEach((raw) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        return;
      }
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0 && colonIndex < 40) {
        const key = trimmed.slice(0, colonIndex).trim();
        const value = trimmed.slice(colonIndex + 1).trim();
        segments.push({
          key,
          value,
        });
        return;
      }
      segments.push({ value: trimmed });
    });

  return segments;
}

const HistoryTab = ({
  historyFilter,
  onFilterChange,
  filteredHistory,
  fileTypeCounts,
}: HistoryTabProps) => {
  const [expandedSummaries, setExpandedSummaries] = useState<
    Record<string, boolean>
  >({});

  const toggleSummary = (id: string): void => {
    setExpandedSummaries((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

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
          filteredHistory.slice(0, 20).map((item) => {
            const summary = item.upgrade?.summary?.trim();
            const summaryId = `history-summary-${item.id}`;
            const isSummaryExpanded = Boolean(
              summary && expandedSummaries[item.id],
            );
            const parsedSummary = summary ? parseSummary(summary) : [];

            return (
              <div
                key={item.id}
                className="rounded-lg border border-content3 bg-content1 shadow-sm"
              >
                <div className="p-2.5 space-y-1.5">
                  {/* Header with icon and file type */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <CheckIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <p className="text-xs opacity-80">
                        {getRenameLabel(item)}
                      </p>
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

                  {/* AI summary accordion */}
                  {summary && (
                    <div className="ml-5">
                      <button
                        type="button"
                        onClick={() => toggleSummary(item.id)}
                        className="text-[10px] text-default-500 hover:text-default-700 transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-default-300 rounded-sm"
                        aria-expanded={isSummaryExpanded}
                        aria-controls={summaryId}
                      >
                        {isSummaryExpanded ? 'Hide summary' : 'Show summary'}
                      </button>
                      {isSummaryExpanded && (
                        <div
                          id={summaryId}
                          className="mt-1.5 rounded-md bg-content2/70 px-2.5 py-2 text-[11px] leading-relaxed"
                        >
                          {parsedSummary.length === 0 ? (
                            <p className="text-default-600 whitespace-pre-wrap break-words">
                              {summary}
                            </p>
                          ) : (
                            <div className="space-y-2.5">
                              {parsedSummary.map((segment, idx) => {
                                // Special handling for Document Title
                                if (segment.key === 'Document Title') {
                                  // Strip surrounding quotes if present
                                  const title = segment.value.replace(
                                    /^["'](.*)["']$/,
                                    '$1',
                                  );
                                  return (
                                    <div
                                      key={`${item.id}-segment-${idx}`}
                                      className="pb-2 border-b border-content3/50"
                                    >
                                      <h4 className="font-medium text-default-800 text-[12px] leading-snug">
                                        {title}
                                      </h4>
                                    </div>
                                  );
                                }

                                // Hide redundant "Content:" label
                                if (
                                  segment.key === 'Content' &&
                                  !segment.value
                                ) {
                                  return null;
                                }

                                // Enhanced page sections
                                if (
                                  segment.key?.startsWith('Page ') ||
                                  segment.value.startsWith('Page ')
                                ) {
                                  const pageMatch = segment.key
                                    ? segment.key.match(/Page (\d+)/)
                                    : segment.value.match(/Page (\d+)/);
                                  const pageNum = pageMatch?.[1];
                                  const content = segment.key
                                    ? segment.value
                                    : segment.value.replace(
                                        /Page \d+[^:]*:\s*/,
                                        '',
                                      );

                                  return (
                                    <div
                                      key={`${item.id}-segment-${idx}`}
                                      className="space-y-1"
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-sm bg-primary/10 text-primary text-[10px] font-medium px-1">
                                          {pageNum || idx + 1}
                                        </span>
                                        <span className="text-[10px] font-medium text-default-700">
                                          Page {pageNum || idx + 1}
                                        </span>
                                      </div>
                                      <p className="text-default-600 leading-relaxed pl-6">
                                        {content}
                                      </p>
                                    </div>
                                  );
                                }

                                // Generic key-value pairs
                                if (segment.key) {
                                  return (
                                    <div
                                      key={`${item.id}-segment-${idx}`}
                                      className="space-y-0.5"
                                    >
                                      <dt className="text-[10px] font-medium text-default-700">
                                        {segment.key}
                                      </dt>
                                      <dd className="text-default-600 leading-relaxed pl-3">
                                        {segment.value}
                                      </dd>
                                    </div>
                                  );
                                }

                                // Plain text segments
                                return (
                                  <p
                                    key={`${item.id}-segment-${idx}`}
                                    className="text-default-600 leading-relaxed"
                                  >
                                    {segment.value}
                                  </p>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

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
                                    item.media.summary.audio[0].sampleRateHz /
                                      1000,
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
            );
          })
        )}
      </div>
    </div>
  );
};

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
  if (filter === 'all') {
    return <p className="text-default-400 text-center py-4">No history yet</p>;
  }

  const typeLabels: Record<string, string> = {
    image: 'images',
    video: 'videos',
    audio: 'audio files',
    pdf: 'PDFs',
    office: 'documents',
    archive: 'archives',
    data: 'data files',
  };

  const label = typeLabels[filter] || 'files';
  return <p className="text-default-400 text-center py-4">No {label} yet</p>;
};
