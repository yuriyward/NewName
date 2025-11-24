import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import type { JSX } from 'react';

export interface SuccessModalProps {
  onClose: () => void;
  onKeepDebugging: () => void;
}

export function SuccessModal({
  onClose,
  onKeepDebugging,
}: SuccessModalProps): JSX.Element {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="w-[min(520px,92vw)] rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-default-200"
      >
        <div className="flex items-start gap-4">
          <span className="mt-1 inline-flex rounded-full bg-emerald-50 p-2 text-emerald-600 ring-1 ring-emerald-100">
            <CheckCircleIcon className="h-6 w-6" />
          </span>
          <div className="space-y-3">
            <div>
              <p className="text-lg font-semibold text-default-900">
                Congrats! local ai model setup finished
              </p>
              <p className="mt-1 text-sm text-default-600">
                You can close this setup tab now or keep it open to continue
                debugging.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
              >
                Okay, close setup
              </button>
              <button
                type="button"
                onClick={onKeepDebugging}
                className="inline-flex items-center justify-center rounded-full border border-default-200 px-4 py-2 text-sm font-semibold text-default-700 transition hover:border-default-300 hover:text-default-900 focus:outline-none focus:ring-2 focus:ring-default-200 focus:ring-offset-1"
              >
                Keep debugging
              </button>
            </div>
            <p className="text-xs text-default-400">
              If the window does not close automatically, you can close the tab
              manually.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
