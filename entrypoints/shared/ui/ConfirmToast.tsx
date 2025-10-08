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
    <div className="w-full rounded-lg border border-slate-600/60 bg-slate-900/95 p-4 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Proposed rename
          </p>
          <p className="mt-1 break-words text-base font-semibold text-slate-50">
            {toast.proposedFilename}
          </p>
        </div>
        <div className="text-right text-sm font-medium text-slate-300">
          {countdownLabel}
        </div>
      </div>

      <div className="mt-3">
        <label
          className="text-xs font-semibold text-slate-400"
          htmlFor={inputId}
        >
          Edit filename
        </label>
        <input
          ref={inputRef}
          id={inputId}
          value={editedName}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          disabled={disableActions}
          spellCheck={false}
          className="mt-1 w-full rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-50 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
        />
      </div>

      <div className="mt-2 text-xs text-slate-400">
        Original:{' '}
        <span className="text-slate-300">{toast.originalFilename}</span>
      </div>

      {chips.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-200"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 text-xs text-slate-300">{statusText}</div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          ref={primaryButtonRef}
          type="button"
          onClick={handleApprove}
          disabled={disableActions}
          className="inline-flex flex-1 items-center justify-center rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          {toast.resolving ? 'Applying…' : 'Apply rename'}
        </button>
        <button
          type="button"
          onClick={onKeep}
          disabled={disableActions}
          className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-500 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
        >
          Keep original
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <button
          type="button"
          onClick={handleAlwaysApply}
          disabled={disableActions}
          className="font-semibold text-indigo-300 underline-offset-2 hover:text-indigo-200 hover:underline disabled:text-slate-500 disabled:no-underline"
        >
          Always apply for this type
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
