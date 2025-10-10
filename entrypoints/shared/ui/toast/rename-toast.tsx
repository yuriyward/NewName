/**
 * RenameToast component displays confirmation feedback for applied renames.
 */
import type React from 'react';
import type { RenameToastProposal } from '@/entrypoints/shared/toast/types';
import { FilenameLabel } from '@/entrypoints/shared/ui/FilenameLabel';

export interface RenameToastState extends RenameToastProposal {
  durationMs: number;
  remainingMs: number;
  dismissAt: number | null;
  paused: boolean;
}

export interface RenameToastProps {
  toast: RenameToastState;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onUndo: () => void;
}

export const RenameToast: React.FC<RenameToastProps> = ({
  toast,
  onHoverStart,
  onHoverEnd,
  onUndo,
}) => {
  const total = toast.durationMs;
  const remaining = Math.max(0, toast.remainingMs);
  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  const progress = total > 0 ? Math.min(1, (total - remaining) / total) : 1;

  return (
    <section
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-auto w-full rounded-lg border border-divider bg-content1 px-3 py-2 shadow-2xl backdrop-blur"
      onPointerEnter={onHoverStart}
      onPointerLeave={onHoverEnd}
      onFocusCapture={onHoverStart}
      onBlurCapture={onHoverEnd}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-primary">✓</span>
          <p className="text-sm font-semibold text-foreground">
            Rename applied
          </p>
        </div>
        <button
          type="button"
          onClick={onUndo}
          className="cursor-pointer text-[10px] font-medium text-primary transition-opacity hover:opacity-70"
        >
          Undo
        </button>
      </div>
      <div className="mt-0.5">
        <FilenameLabel
          originalFilename={toast.originalFilename}
          newFilename={toast.finalFilename}
          layout="inline"
        />
      </div>
      <div className="mt-2 h-1 rounded bg-default-100">
        <div
          className="h-full rounded bg-primary transition-[width] duration-200"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="mt-2 text-right text-[10px] font-medium uppercase tracking-wide text-default-400">
        {toast.paused ? 'Paused' : `Hiding in ${seconds}s`}
      </div>
    </section>
  );
};
