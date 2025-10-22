import { truncateFilenameMiddle } from '@base-app/entrypoints/shared/utils/filename';
import { Tooltip } from '@heroui/tooltip';
import { useMemo } from 'react';

export const truncateFilenameInMiddle = truncateFilenameMiddle;

interface FilenameDisplayProps {
  original: string;
  renamed: string;
  className?: string;
  showTooltips?: boolean;
}

export const FilenameDisplay = ({
  original,
  renamed,
  className = '',
  showTooltips = true,
}: FilenameDisplayProps) => {
  const maxCharsByWidth = 48;

  const displayOriginal = useMemo(
    () => truncateFilenameInMiddle(original, maxCharsByWidth),
    [original],
  );
  const displayRenamed = useMemo(
    () => truncateFilenameInMiddle(renamed, maxCharsByWidth),
    [renamed],
  );

  const originalTruncated = displayOriginal !== original;
  const renamedTruncated = displayRenamed !== renamed;

  return (
    <p className={`text-xs font-medium break-words ${className}`}>
      <Tooltip
        content={original}
        isDisabled={!showTooltips || !originalTruncated}
        delay={0}
        closeDelay={0}
        size="sm"
        classNames={{
          content: 'text-xs bg-black text-white px-2 py-1 rounded',
        }}
      >
        <span className="opacity-80">{displayOriginal}</span>
      </Tooltip>
      <span className="mx-1">→</span>
      <Tooltip
        content={renamed}
        isDisabled={!showTooltips || !renamedTruncated}
        delay={0}
        closeDelay={0}
        size="sm"
        classNames={{
          content: 'text-xs bg-black text-white px-2 py-1 rounded',
        }}
      >
        <strong>{displayRenamed}</strong>
      </Tooltip>
    </p>
  );
};
