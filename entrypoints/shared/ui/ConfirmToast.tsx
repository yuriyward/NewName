import React, {
  type ChangeEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ConfirmToastRenderState } from '@/entrypoints/shared/ui/confirm-toast-types';

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

function defaultStatusMessage(
  toast: ConfirmToastRenderState,
  countdown: number | null,
): string {
  if (toast.status === 'pending') {
    if (toast.allowAutoApply && toast.autoApplyAt && countdown !== null) {
      return countdown > 0
        ? `Auto-applying in ${formatCountdown(countdown)}`
        : 'Applying…';
    }
    return 'Awaiting your decision';
  }
  if (toast.status === 'applied') {
    return toast.statusMessage ?? 'Rename applied';
  }
  if (toast.status === 'kept') {
    return toast.statusMessage ?? 'Kept original filename';
  }
  if (toast.status === 'timeout') {
    return toast.statusMessage ?? 'Auto-applied';
  }
  if (toast.status === 'dismissed') {
    return toast.statusMessage ?? 'Dismissed';
  }
  if (toast.status === 'error') {
    return toast.statusMessage ?? 'Action failed. Try again.';
  }
  return toast.statusMessage ?? '';
}

function uniqueChips(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }
  return output;
}

export const ConfirmToast: React.FC<ConfirmToastProps> = ({
  toast,
  autoFocus = false,
  onApprove,
  onKeep,
  onAlwaysApply,
}) => {
  const [editedName, setEditedName] = useState(toast.proposedFilename);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(() =>
    computeCountdownSeconds(toast.autoApplyAt),
  );
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  const chips = useMemo(
    () =>
      uniqueChips([
        ...toast.sensitiveReasons.map((reason) => reason.replace(/-/g, ' ')),
        ...toast.reasonTags,
      ]),
    [toast.reasonTags, toast.sensitiveReasons],
  );

  const statusText = useMemo(
    () => defaultStatusMessage(toast, countdownSeconds),
    [toast, countdownSeconds],
  );

  const isPending = toast.status === 'pending';
  const disableActions = toast.resolving || !isPending;

  const handleApprove = () => {
    const trimmed = editedName.trim();
    const value = trimmed.length > 0 ? trimmed : toast.proposedFilename.trim();
    onApprove(value !== toast.proposedFilename ? value : undefined);
  };

  const handleAlwaysApply = () => {
    const trimmed = editedName.trim();
    const value = trimmed.length > 0 ? trimmed : toast.proposedFilename.trim();
    onAlwaysApply(value !== toast.proposedFilename ? value : undefined);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEditedName(event.target.value);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !disableActions) {
      event.preventDefault();
      handleApprove();
    }
  };

  const countdownLabel =
    toast.allowAutoApply && countdownSeconds !== null
      ? formatCountdown(countdownSeconds)
      : null;

  return (
    <div className="w-full rounded-lg border border-divider bg-content1 p-3 shadow-lg backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold text-foreground">
            {toast.proposedFilename}
          </p>
          <p className="mt-0.5 truncate text-xs text-default-500">
            {toast.originalFilename}
          </p>
        </div>
        {countdownLabel ? (
          <div className="shrink-0 rounded-full bg-default-100 px-2 py-0.5 text-xs font-medium text-default-700">
            {countdownLabel}
          </div>
        ) : null}
      </div>

      {chips.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}

      <input
        ref={inputRef}
        id={inputId}
        value={editedName}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        disabled={disableActions}
        spellCheck={false}
        placeholder="Edit filename…"
        className="mt-2 w-full rounded border border-default-200 bg-default-100 px-2 py-1 text-xs text-foreground placeholder-default-400 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/50"
      />

      {statusText && isPending ? (
        <div className="mt-2 text-[11px] text-default-500">{statusText}</div>
      ) : null}

      <div className="mt-2 flex gap-1.5">
        <button
          ref={primaryButtonRef}
          type="button"
          onClick={handleApprove}
          disabled={disableActions}
          className="inline-flex flex-1 items-center justify-center rounded bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {toast.resolving ? 'Applying…' : 'Apply'}
        </button>
        <button
          type="button"
          onClick={onKeep}
          disabled={disableActions}
          className="inline-flex flex-1 items-center justify-center rounded border border-default-300 bg-transparent px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-default-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Keep
        </button>
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[10px] text-default-400">
        <button
          type="button"
          onClick={handleAlwaysApply}
          disabled={disableActions}
          className="font-medium text-primary hover:opacity-80 disabled:opacity-40"
        >
          Always apply
        </button>
        <span>Esc keeps original</span>
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
