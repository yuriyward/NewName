/**
 * Editor hooks for toast filename editing
 * Simplified for hover-based edit mode
 */

import { useEffect, useState } from 'react';

interface UseToastEditorParams {
  proposedFilename: string;
  onApprove: (editedName?: string) => void;
  onKeep: () => void;
}

/**
 * Hook to manage filename editing state and actions
 * Handles edit mode, name changes, and button callbacks
 */
export function useToastEditor({
  proposedFilename,
  onApprove,
  onKeep,
}: UseToastEditorParams) {
  const [editedName, setEditedName] = useState(proposedFilename);

  useEffect(() => {
    setEditedName(proposedFilename);
  }, [proposedFilename]);

  const handleApprove = () => {
    const trimmed = editedName.trim();
    const value = trimmed.length > 0 ? trimmed : proposedFilename.trim();
    onApprove(value !== proposedFilename ? value : undefined);
  };

  const handleKeep = () => {
    onKeep();
  };

  const handleEditChange = (newName: string) => {
    setEditedName(newName);
  };

  const resetEditedName = () => {
    setEditedName(proposedFilename);
  };

  return {
    editedName,
    handleEditChange,
    handleApprove,
    handleKeep,
    resetEditedName,
  };
}
