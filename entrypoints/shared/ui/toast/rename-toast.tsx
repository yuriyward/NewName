/**
 * RenameToast component displays confirmation feedback for applied renames.
 * Simplified design matching ai/design/src/notification-examples.tsx
 */
import { CheckIcon } from '@heroicons/react/16/solid';
import type React from 'react';
import type { RenameToastProposal } from '@/entrypoints/shared/toast/types';

export interface RenameToastState extends RenameToastProposal {
  remainingMs: number;
  dismissAt: number | null;
  paused: boolean;
}

export interface RenameToastProps {
  toast: RenameToastState;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

export const RenameToast: React.FC<RenameToastProps> = ({
  toast,
  onHoverStart,
  onHoverEnd,
}) => {
  return (
    <section
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-auto rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-2xl inline-flex items-center gap-2.5 max-w-[50vw]"
      onPointerEnter={onHoverStart}
      onPointerLeave={onHoverEnd}
      onFocusCapture={onHoverStart}
      onBlurCapture={onHoverEnd}
    >
      <CheckIcon className="size-4 text-green-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs break-words">
          Renamed to{' '}
          <strong className="font-medium">{toast.finalFilename}</strong>
        </p>
      </div>
      {toast.paused && <span className="text-xs opacity-60">⏸</span>}
    </section>
  );
};
