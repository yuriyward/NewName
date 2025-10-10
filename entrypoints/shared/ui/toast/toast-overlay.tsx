/**
 * ToastOverlay renders both confirm and rename toasts in a fixed overlay.
 */
import { HeroUIProvider } from '@heroui/react';
import React from 'react';
import type { ConfirmToastState } from '@/entrypoints/shared/toast/types';
import { ConfirmToast } from '@/entrypoints/shared/ui/ConfirmToast';
import type { RenameToastState } from './rename-toast';
import { RenameToast } from './rename-toast';

export interface ToastOverlayProps {
  confirmToasts: ConfirmToastState[];
  renameToasts: RenameToastState[];
  onApprove: (toast: ConfirmToastState, edited?: string) => void;
  onKeep: (toast: ConfirmToastState) => void;
  onAlwaysApply: (toast: ConfirmToastState, edited?: string) => void;
  onRenameHoverStart: (toastId: string) => void;
  onRenameHoverEnd: (toastId: string) => void;
  onRenameUndo: (toastId: string) => void;
}

export const ToastOverlay: React.FC<ToastOverlayProps> = React.memo(
  ({
    confirmToasts,
    renameToasts,
    onApprove,
    onKeep,
    onAlwaysApply,
    onRenameHoverStart,
    onRenameHoverEnd,
    onRenameUndo,
  }) => {
    if (confirmToasts.length === 0 && renameToasts.length === 0) return null;
    return (
      <HeroUIProvider>
        <div className="pointer-events-none fixed inset-0 z-[2147483647] flex flex-col items-end justify-end gap-2 px-4 py-4">
          <div className="flex w-full max-w-xs flex-col gap-2">
            {confirmToasts.map((toast, index) => (
              <div
                key={toast.toastId}
                className="pointer-events-auto animate-in fade-in slide-in-from-right-2 duration-300"
              >
                <ConfirmToast
                  toast={toast}
                  autoFocus={index === 0}
                  onApprove={(edited) => onApprove(toast, edited)}
                  onKeep={() => onKeep(toast)}
                  onAlwaysApply={(edited) => onAlwaysApply(toast, edited)}
                />
              </div>
            ))}
            {renameToasts.map((toast) => (
              <div
                key={toast.toastId}
                className="animate-in fade-in slide-in-from-right-2 duration-300"
              >
                <RenameToast
                  toast={toast}
                  onHoverStart={() => onRenameHoverStart(toast.toastId)}
                  onHoverEnd={() => onRenameHoverEnd(toast.toastId)}
                  onUndo={() => onRenameUndo(toast.toastId)}
                />
              </div>
            ))}
          </div>
        </div>
      </HeroUIProvider>
    );
  },
);
