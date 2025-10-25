import type React from 'react';

interface FilenameLabelProps {
  /** The original filename before renaming */
  originalFilename: string;
  /** The new filename after renaming */
  newFilename: string;
  /** Optional CSS classes to customize styling */
  className?: string;
}

/**
 * FilenameLabel displays a before/after filename comparison with visual hierarchy.
 *
 * Used throughout the application to show rename operations:
 * - History items in the popup
 * - Toast notifications after rename
 * - Confirmation dialogs
 *
 * The original filename is shown with reduced opacity, followed by an arrow (→),
 * and the new filename is emphasized with medium font weight.
 *
 * @example
 * <FilenameLabel
 *   originalFilename="IMG_1234.jpg"
 *   newFilename="sunset-beach-2024.jpg"
 * />
 *
 * @example With custom styling
 * <FilenameLabel
 *   originalFilename="document.pdf"
 *   newFilename="quarterly-report-q4-2024.pdf"
 *   className="text-sm"
 * />
 */
export const FilenameLabel: React.FC<FilenameLabelProps> = ({
  originalFilename,
  newFilename,
  className = '',
}) => {
  return (
    <p className={`text-xs break-words ${className}`}>
      <span className="opacity-80">{originalFilename}</span>
      <span className="mx-1">→</span>
      <strong className="font-medium">{newFilename}</strong>
    </p>
  );
};
