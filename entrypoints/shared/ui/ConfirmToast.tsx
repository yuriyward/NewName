import {
  CheckIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from '@heroicons/react/16/solid';
import React, {
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ConfirmToastState } from '@/entrypoints/shared/toast/types';
import { FilenameLabel } from '@/entrypoints/shared/ui/FilenameLabel';
import { IconPause } from '@/entrypoints/shared/ui/icons';
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
}

// State configuration for icons and messages
const stateConfig: Record<
  string,
  {
    icon: React.ComponentType<{ className: string }>;
    color: string;
    message: string;
  }
> = {
  pending: {
    icon: SparklesIcon,
    color: 'text-blue-600',
    message: 'Better name found',
  },
  applied: {
    icon: CheckIcon,
    color: 'text-green-600',
    message: 'Renamed',
  },
  error: {
    icon: ExclamationTriangleIcon,
    color: 'text-red-600',
    message: 'Failed to rename — kept original',
  },
};

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
}) => {
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Use extracted hooks for countdown and editor
  const {
    countdownSeconds,
    countdownAnnouncement,
    isCountdownPaused,
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
    handleEditChange,
    handleApprove,
    handleKeep,
    resetEditedName,
  } = useToastEditor({
    proposedFilename: toast.proposedFilename,
    onApprove,
    onKeep,
  });

  // Get state configuration
  const config = stateConfig[toast.status] || stateConfig.pending;
  const Icon = config.icon;
  const isPending = toast.status === 'pending';
  const disableActions = toast.resolving || !isPending;
  const showFilename = toast.status !== 'error';

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && toast.status === 'pending') {
      primaryButtonRef.current?.focus();
    }
  }, [autoFocus, toast.status]);

  // Focus and select textarea when entering hover edit mode
  useEffect(() => {
    if (isHovered && isPending && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      // Auto-resize textarea
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isHovered, isPending]);

  const handlePointerEnter = () => {
    if (isPending) {
      setIsHovered(true);
      pauseCountdown();
    }
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    resetEditedName();
    resumeCountdown();
  };

  const handleTextareaChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    handleEditChange(event.target.value);
    // Auto-resize textarea as user types
    event.target.style.height = 'auto';
    event.target.style.height = `${event.target.scrollHeight}px`;
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !disableActions) {
      event.preventDefault();
      handleApprove();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsHovered(false);
      resetEditedName();
    }
  };

  const countdownLabel =
    toast.allowAutoApply && countdownSeconds !== null
      ? formatCountdown(countdownSeconds)
      : null;

  return (
    <div
      className="w-full rounded-lg border border-gray-200 bg-white shadow-2xl"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
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
      <div className="p-3 space-y-2">
        {/* Header with icon, message, and countdown */}
        <div
          className={`flex ${toast.status === 'error' ? 'items-center' : 'items-start'} justify-between gap-2`}
        >
          <div
            className={`flex ${toast.status === 'error' ? 'items-center' : 'items-start'} gap-2 flex-1 min-w-0`}
          >
            <Icon
              className={`w-4 h-4 ${config.color} flex-shrink-0 ${toast.status !== 'error' ? 'mt-0.5' : ''}`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs opacity-80">{config.message}</p>
            </div>
          </div>
          {isPending && countdownLabel && (
            <span className="text-xs font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-nowrap flex-shrink-0 flex items-center justify-center gap-1">
              {isHovered && isCountdownPaused ? (
                <IconPause className="w-3.5 h-3.5" />
              ) : (
                countdownLabel
              )}
            </span>
          )}
        </div>

        {/* Filename display - static or editing */}
        {showFilename && (
          <div className="ml-6">
            {isHovered && isPending ? (
              <div className="space-y-2">
                {/* Edit mode on hover */}
                <div>
                  <p className="text-xs opacity-60 mb-1">
                    {toast.originalFilename}
                  </p>
                  <textarea
                    ref={textareaRef}
                    value={editedName}
                    onChange={handleTextareaChange}
                    onKeyDown={handleTextareaKeyDown}
                    disabled={disableActions}
                    rows={2}
                    spellCheck={false}
                    className="w-full text-xs px-2 py-1 border border-primary rounded bg-default-100 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {/* Action buttons on hover */}
                <div className="flex gap-2">
                  <button
                    ref={primaryButtonRef}
                    type="button"
                    onClick={handleApprove}
                    disabled={disableActions}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-sm font-normal text-xs cursor-pointer transition-all bg-zinc-900 text-white hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {toast.resolving ? 'Applying…' : 'Rename'}
                  </button>
                  <button
                    type="button"
                    onClick={handleKeep}
                    disabled={disableActions}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-sm font-normal text-xs cursor-pointer transition-all bg-gray-100 text-zinc-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Keep Original
                  </button>
                </div>
              </div>
            ) : (
              <FilenameLabel
                originalFilename={toast.originalFilename}
                newFilename={editedName}
                className="text-xs"
              />
            )}
          </div>
        )}

        {/* Error message if present */}
        {toast.status !== 'pending' && toast.statusMessage ? (
          <p className="rounded border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-600">
            {toast.statusMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
};
