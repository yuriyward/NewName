/**
 * Editor hooks for toast filename editing
 */

import { useEffect, useState } from 'react';

interface UseToastEditorParams {
  proposedFilename: string;
  onApprove: (editedName?: string) => void;
  onKeep: () => void;
  onAlwaysApply: (editedName?: string) => void;
}

/**
 * Hook to manage filename editing state and actions
 * Handles edit mode toggling, name changes, and button callbacks
 */
export function useToastEditor({
  proposedFilename,
  onApprove,
  onKeep,
  onAlwaysApply,
}: UseToastEditorParams) {
  const [editedName, setEditedName] = useState(proposedFilename);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setEditedName(proposedFilename);
  }, [proposedFilename]);

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedName(proposedFilename);
  };

  const handleApprove = () => {
    if (isEditing) {
      handleCancelEdit();
      return;
    }
    const trimmed = editedName.trim();
    const value = trimmed.length > 0 ? trimmed : proposedFilename.trim();
    onApprove(value !== proposedFilename ? value : undefined);
  };

  const handleKeep = () => {
    if (isEditing) {
      handleCancelEdit();
      return;
    }
    onKeep();
  };

  const handleAlwaysApply = () => {
    if (isEditing) {
      handleCancelEdit();
      return;
    }
    const trimmed = editedName.trim();
    const value = trimmed.length > 0 ? trimmed : proposedFilename.trim();
    onAlwaysApply(value !== proposedFilename ? value : undefined);
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleApplyEdit = () => {
    setIsEditing(false);
    // Just exit edit mode, keep the edited value
    // The main Apply button will actually submit the change
  };

  const handleEditChange = (newName: string) => {
    setEditedName(newName);
  };

  return {
    editedName,
    isEditing,
    handleEditChange,
    handleEditClick,
    handleApplyEdit,
    handleCancelEdit,
    handleApprove,
    handleKeep,
    handleAlwaysApply,
  };
}
