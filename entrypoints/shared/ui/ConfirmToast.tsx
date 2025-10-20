import React, { type CSSProperties, useEffect, useMemo, useRef } from 'react';
import type { ConfirmToastState } from '@/entrypoints/shared/toast/types';
import { CountdownBadge } from '@/entrypoints/shared/ui/CountdownBadge';
import { FilenameEditor } from '@/entrypoints/shared/ui/FilenameEditor';
import {
  formatCountdown,
  useToastCountdown,
} from '@/entrypoints/shared/ui/useToastCountdown';
import { useToastEditor } from '@/entrypoints/shared/ui/useToastEditor';

interface ConfirmToastProps {
  toast: ConfirmToastState;
  autoFocus?: boolean;
  onApprove: (editedName?: string) => void;
  onKeep: () => void;
  onAlwaysApply: (editedName?: string) => void;
}

const SR_ONLY_STYLES: CSSProperties = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  width: '1px',
  whiteSpace: 'nowrap',
};

export const ConfirmToast: React.FC<ConfirmToastProps> = ({
  toast,
  autoFocus = false,
  onApprove,
  onKeep,
  onAlwaysApply,
}) => {
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const inputId = useMemo(
    () => `confirm-toast-${toast.toastId}-input`,
    [toast.toastId],
  );

  // Use extracted hooks for countdown and editor
  const {
    countdownSeconds,
    countdownAnnouncement,
    pauseCountdown,
    resumeCountdown,
  } = useToastCountdown({
    allowAutoApply: toast.allowAutoApply,
    autoApplyAt: toast.autoApplyAt,
    autoApplyRemainingMs: toast.autoApplyRemainingMs,
    status: toast.status,
    toastId: toast.toastId,
  });

  const {
    editedName,
    isEditing,
    handleEditChange,
    handleEditClick,
    handleApplyEdit,
    handleCancelEdit,
    handleApprove,
    handleKeep,
    handleAlwaysApply,
  } = useToastEditor({
    proposedFilename: toast.proposedFilename,
    onApprove,
    onKeep,
    onAlwaysApply,
  });

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && toast.status === 'pending') {
      primaryButtonRef.current?.focus();
    }
  }, [autoFocus, toast.status]);

  const isPending = toast.status === 'pending';
  const disableActions = toast.resolving || !isPending;

  const countdownLabel =
    toast.allowAutoApply && countdownSeconds !== null
      ? formatCountdown(countdownSeconds)
      : null;

  return (
    <div
      className="w-full rounded-lg border border-divider bg-content1 p-3 shadow-2xl backdrop-blur"
      onPointerEnter={pauseCountdown}
      onPointerLeave={resumeCountdown}
    >
      {countdownAnnouncement ? (
        <output
          aria-live="polite"
          aria-atomic="true"
          data-test="confirm-toast-countdown-live"
          style={SR_ONLY_STYLES}
        >
          {countdownAnnouncement}
        </output>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <FilenameEditor
          originalFilename={toast.originalFilename}
          editedName={editedName}
          isEditing={isEditing}
          disableActions={disableActions}
          inputId={inputId}
          onEditChange={handleEditChange}
          onEditClick={handleEditClick}
          onApplyEdit={handleApplyEdit}
          onCancelEdit={handleCancelEdit}
        />
        {countdownLabel ? (
          <CountdownBadge seconds={parseInt(countdownLabel, 10)} />
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
      {toast.status !== 'pending' && toast.statusMessage ? (
        <p className="mt-2 rounded border border-danger-200 bg-danger-50 px-2 py-1 text-[11px] font-medium text-danger-600">
          {toast.statusMessage}
        </p>
      ) : null}
    </div>
  );
};
