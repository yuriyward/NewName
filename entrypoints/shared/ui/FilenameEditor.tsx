/**
 * Filename editor component
 * Handles both display and editing modes for the proposed filename
 */

import CheckIcon from '@heroicons/react/24/solid/CheckIcon';
import PencilIcon from '@heroicons/react/24/solid/PencilIcon';
import React, {
  type ChangeEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
} from 'react';
import { FilenameLabel } from '@/entrypoints/shared/ui/FilenameLabel';

interface FilenameEditorProps {
  originalFilename: string;
  editedName: string;
  isEditing: boolean;
  disableActions: boolean;
  inputId: string;
  onEditChange: (newName: string) => void;
  onEditClick: () => void;
  onApplyEdit: () => void;
  onCancelEdit: () => void;
}

export const FilenameEditor: React.FC<FilenameEditorProps> = ({
  originalFilename,
  editedName,
  isEditing,
  disableActions,
  inputId,
  onEditChange,
  onEditClick,
  onApplyEdit,
  onCancelEdit,
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      // Auto-resize textarea to fit content
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onEditChange(event.target.value);
    // Auto-resize textarea as user types
    event.target.style.height = 'auto';
    event.target.style.height = `${event.target.scrollHeight}px`;
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !disableActions) {
      event.preventDefault();
      onApplyEdit();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancelEdit();
    }
  };

  return (
    <FilenameLabel originalFilename={originalFilename}>
      {isEditing ? (
        <div className="mt-1 flex items-start gap-2">
          <textarea
            ref={inputRef}
            id={inputId}
            value={editedName}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            disabled={disableActions}
            spellCheck={false}
            rows={1}
            className="min-w-0 flex-1 resize-none rounded border border-primary bg-default-100 px-2 py-1 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/50"
          />
          <button
            type="button"
            onClick={onApplyEdit}
            disabled={disableActions}
            className="flex shrink-0 cursor-pointer items-center justify-center rounded bg-primary p-1.5 text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            title="Apply (Enter)"
          >
            <CheckIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="mt-1 flex items-center gap-2">
          <p className="min-w-0 flex-1 break-all text-sm font-semibold text-foreground">
            {editedName}
          </p>
          <button
            type="button"
            onClick={onEditClick}
            disabled={disableActions}
            className="flex shrink-0 cursor-pointer items-center justify-center rounded border border-default-300 p-1 text-primary transition-all hover:border-primary hover:bg-default-100 disabled:cursor-not-allowed disabled:opacity-40"
            title="Edit filename"
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </FilenameLabel>
  );
};
