import type React from 'react';

interface FilenameLabelProps {
  originalFilename: string;
  newFilename?: string;
  children?: React.ReactNode;
  layout?: 'stacked' | 'inline';
}

/**
 * Shared component for displaying filename transitions (original → new)
 * Used by both ConfirmToast and RenameToast for consistent styling.
 *
 * For inline layout, newFilename must be provided.
 * For stacked layout, either newFilename or children can be provided for custom content.
 */
export const FilenameLabel: React.FC<FilenameLabelProps> = ({
  originalFilename,
  newFilename,
  children,
  layout = 'stacked',
}) => {
  if (layout === 'inline') {
    return (
      <p className="text-xs text-default-500">
        {originalFilename} →{' '}
        <span className="font-semibold text-foreground">{newFilename}</span>
      </p>
    );
  }

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <p className="min-w-0 truncate text-xs text-default-500">
          {originalFilename}
        </p>
        <span className="shrink-0 text-xs text-default-400">→</span>
      </div>
      {children || (
        <p className="mt-1 min-w-0 flex-1 break-all text-sm font-semibold text-foreground">
          {newFilename}
        </p>
      )}
    </div>
  );
};
