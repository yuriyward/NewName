import { CheckIcon, FolderIcon } from '@heroicons/react/16/solid';
import { Chip } from '@heroui/chip';
import { Tooltip } from '@heroui/tooltip';
import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { getManagedRelativePath } from '@/entrypoints/shared/filesystem/handle-storage';
import type { HistoryItem as HistoryItemType } from '@/entrypoints/shared/history/types';
import { FilenameLabel } from '@/entrypoints/shared/ui/FilenameLabel';
import { SummaryDisplay } from './SummaryDisplay';
import { getRenameLabel } from './utils';

interface HistoryItemProps {
  item: HistoryItemType;
  isSummaryExpanded: boolean;
  onToggleSummary: () => void;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({
  item,
  isSummaryExpanded,
  onToggleSummary,
}) => {
  const summary = item.upgrade?.summary?.trim();
  const [managedFolder, setManagedFolder] = useState<string | null>(null);

  // Fetch managed folder path on mount
  useEffect(() => {
    getManagedRelativePath().then(setManagedFolder).catch(console.error);
  }, []);

  // Check if file was renamed by comparing original vs final names
  const wasRenamed = item.original !== item.final;

  // Build tooltip content based on rename status
  const tooltipContent = wasRenamed
    ? managedFolder
      ? `Show in folder. Look in: ${managedFolder}/${item.path}`
      : `Show in folder. File: ${item.path}`
    : 'Show in folder';

  const handleShowInFolder = async (): Promise<void> => {
    if (item.downloadId === undefined) return;

    if (wasRenamed) {
      // File was renamed - open the downloads folder
      // Chrome can't show the specific file because it only knows the old filename
      await browser.downloads.showDefaultFolder();
    } else {
      // File not renamed - show the specific file in its folder
      await browser.downloads.show(item.downloadId);
    }
  };

  return (
    <div className="rounded-lg border border-content3 bg-content1 shadow-sm">
      <div className="p-2.5 space-y-1.5">
        {/* Header with icon and file type */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CheckIcon className="size-4 text-green-600 flex-shrink-0" />
            <p className="text-xs opacity-80">
              {getRenameLabel(item, wasRenamed)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {item.downloadId !== undefined && (
              <Tooltip
                content={tooltipContent}
                size="sm"
                delay={300}
                closeDelay={0}
              >
                <button
                  type="button"
                  onClick={handleShowInFolder}
                  className="p-1 rounded hover:bg-content2 transition-colors focus:outline-none focus:ring-2 focus:ring-default-400 cursor-pointer"
                >
                  <FolderIcon className="size-3.5 text-default-600" />
                </button>
              </Tooltip>
            )}
            <Chip
              size="sm"
              variant="flat"
              color={
                item.fileType === 'video' || item.fileType === 'audio'
                  ? 'secondary'
                  : 'default'
              }
              className="text-[10px]"
            >
              {item.fileType}
            </Chip>
          </div>
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
          <SummaryDisplay
            summary={summary}
            itemId={item.id}
            isExpanded={isSummaryExpanded}
            onToggle={onToggleSummary}
          />
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
                        {Math.round(item.media.summary.video[0].frameRate)}
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
                      <span>{item.media.summary.audio[0].channels}ch</span>
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
                    {Math.round(item.media.summary.general.durationMs / 1000)}s
                  </span>
                </>
              )}
            </div>
          )}
      </div>
    </div>
  );
};
