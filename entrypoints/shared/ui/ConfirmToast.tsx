import React, {
  type ChangeEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ConfirmToastRenderState } from '@/entrypoints/shared/toast/types';
import { FilenameLabel } from '@/entrypoints/shared/ui/FilenameLabel';
import { CheckIcon, PencilIcon } from '@/entrypoints/shared/ui/icons';

interface ConfirmToastProps {
  toast: ConfirmToastRenderState;
  autoFocus?: boolean;
  onApprove: (editedName?: string) => void;
  onKeep: () => void;
  onAlwaysApply: (editedName?: string) => void;
}

const COUNTDOWN_INTERVAL_MS = 250;

function formatCountdown(seconds: number | null): string {
  if (seconds === null) return '';
  if (seconds <= 0) return '0s';
  return `${seconds}s`;
}

export const ConfirmToast: React.FC<ConfirmToastProps> = ({
  toast,
  autoFocus = false,
  onApprove,
  onKeep,
  onAlwaysApply,
}) => {
  const [editedName, setEditedName] = useState(toast.proposedFilename);
  const [isEditing, setIsEditing] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(() =>
    computeCountdownSeconds(toast.autoApplyAt),
  );
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputId = useMemo(
    () => `confirm-toast-${toast.toastId}-input`,
    [toast.toastId],
  );

  useEffect(() => {
    setEditedName(toast.proposedFilename);
  }, [toast.proposedFilename]);

  useEffect(() => {
    if (!toast.autoApplyAt || toast.status !== 'pending') {
      setCountdownSeconds(null);
      return;
    }
    const tick = () => {
      setCountdownSeconds(computeCountdownSeconds(toast.autoApplyAt));
    };
    tick();
    const interval = setInterval(tick, COUNTDOWN_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [toast.autoApplyAt, toast.status]);

  useEffect(() => {
    if (autoFocus && toast.status === 'pending') {
      primaryButtonRef.current?.focus();
    }
  }, [autoFocus, toast.status]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      // Auto-resize textarea to fit content
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  const isPending = toast.status === 'pending';
  const disableActions = toast.resolving || !isPending;

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedName(toast.proposedFilename);
  };

  const handleApprove = () => {
    if (isEditing) {
      handleCancelEdit();
      return;
    }
    const trimmed = editedName.trim();
    const value = trimmed.length > 0 ? trimmed : toast.proposedFilename.trim();
    onApprove(value !== toast.proposedFilename ? value : undefined);
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
    const value = trimmed.length > 0 ? trimmed : toast.proposedFilename.trim();
    onAlwaysApply(value !== toast.proposedFilename ? value : undefined);
  };

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setEditedName(event.target.value);
    // Auto-resize textarea as user types
    event.target.style.height = 'auto';
    event.target.style.height = `${event.target.scrollHeight}px`;
  };

  const handleEditClick = () => {
    if (disableActions) return;
    setIsEditing(true);
  };

  const handleApplyEdit = () => {
    setIsEditing(false);
    // Just exit edit mode, keep the edited value
    // The main Apply button will actually submit the change
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !disableActions) {
      event.preventDefault();
      handleApplyEdit();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancelEdit();
    }
  };

  const countdownLabel =
    toast.allowAutoApply && countdownSeconds !== null
      ? formatCountdown(countdownSeconds)
      : null;

  const isUrgent = countdownSeconds !== null && countdownSeconds <= 5;

  return (
    <div className="w-full rounded-lg border border-divider bg-content1 p-3 shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <FilenameLabel originalFilename={toast.originalFilename}>
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
                onClick={handleApplyEdit}
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
                onClick={handleEditClick}
                disabled={disableActions}
                className="flex shrink-0 cursor-pointer items-center justify-center rounded border border-default-300 p-1 text-primary transition-all hover:border-primary hover:bg-default-100 disabled:cursor-not-allowed disabled:opacity-40"
                title="Edit filename"
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </FilenameLabel>
        {countdownLabel ? (
          <div
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
              isUrgent
                ? 'bg-warning-100 text-warning-700'
                : 'bg-default-100 text-default-700'
            }`}
          >
            {countdownLabel}
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex gap-2">
        <button
          ref={primaryButtonRef}
          type="button"
          onClick={handleApprove}
          disabled={disableActions}
          className={`inline-flex flex-1 items-center justify-center rounded bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40 ${
            isEditing ? 'cursor-pointer opacity-60' : 'cursor-pointer'
          }`}
        >
          {toast.resolving ? 'Applying…' : 'Apply'}
        </button>
        <button
          type="button"
          onClick={handleKeep}
          disabled={disableActions}
          className={`inline-flex flex-1 items-center justify-center rounded border border-default-300 bg-transparent px-2.5 py-1.5 text-xs font-semibold text-foreground transition-all hover:border-default-400 hover:bg-default-200 disabled:cursor-not-allowed disabled:opacity-40 ${
            isEditing ? 'cursor-pointer opacity-60' : 'cursor-pointer'
          }`}
        >
          Keep original
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-default-400">
        <button
          type="button"
          onClick={handleAlwaysApply}
          disabled={disableActions}
          className={`font-semibold text-primary transition-all hover:underline hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40 ${
            isEditing ? 'cursor-pointer opacity-60' : 'cursor-pointer'
          }`}
        >
          Always apply
        </button>
        <span>Esc to cancel</span>
      </div>
    </div>
  );
};

function computeCountdownSeconds(autoApplyAt: number | null): number | null {
  if (!autoApplyAt) return null;
  const diff = autoApplyAt - Date.now();
  if (!Number.isFinite(diff)) return null;
  return diff > 0 ? Math.ceil(diff / 1000) : 0;
}
