import type React from 'react';

interface FilenameLabelProps {
  originalFilename: string;
  newFilename: string;
  className?: string;
}

/**
 * Simple filename display component showing original → renamed pattern
 * Matches design system from ai/design with inline formatting
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
