import type { JSX } from 'react';

export interface ConsentDenialModalProps {
  open: boolean;
  onEnableAI: () => void;
  onContinueManual: () => void;
}

/**
 * Modal shown when user denies page context consent
 * Explains that AI features will be unavailable and offers alternatives
 */
export function ConsentDenialModal({
  open,
  onEnableAI,
  onContinueManual,
}: ConsentDenialModalProps): JSX.Element | null {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-default-200 bg-background p-6 shadow-2xl">
        <div className="space-y-4">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="rounded-full bg-warning-100 p-3 text-warning-600">
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Warning</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-center text-lg font-semibold text-foreground">
            Consent Required
          </h2>

          {/* Message */}
          <p className="text-sm text-default-600 text-center">
            Please check the consent box above to enable AI features.
          </p>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={onEnableAI}
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
            >
              ← Go Back and Check the Box
            </button>
            <button
              type="button"
              onClick={onContinueManual}
              className="w-full rounded-lg border border-default-300 bg-background px-4 py-2.5 text-sm font-medium text-default-500 hover:bg-default-100 focus:outline-none focus:ring-2 focus:ring-default-400 focus:ring-offset-2 transition-colors"
            >
              Skip AI Features
            </button>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-default-400">
            You can enable AI later in Settings
          </p>
        </div>
      </div>
    </div>
  );
}
