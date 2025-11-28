import { Tooltip } from '@heroui/tooltip';
import { type JSX, useId, useState } from 'react';

export interface ConsentModalProps {
  open: boolean;
  choice: 'local' | 'cloud';
  onConfirm: () => void;
  onDecline: () => void;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * Modal for obtaining user consent before enabling AI features
 * Shows data access disclosure and requires explicit agreement
 * Compliant with GDPR/CCPA and Chrome Web Store policies
 */
export function ConsentModal({
  open,
  choice,
  onConfirm,
  onDecline,
  onCancel,
  loading = false,
}: ConsentModalProps): JSX.Element | null {
  const checkboxId = useId();
  const [consentChecked, setConsentChecked] = useState(false);

  if (!open) return null;

  const choiceLabel = choice === 'local' ? 'Local AI' : 'Cloud AI';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default border-none"
        onClick={onCancel}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        aria-label="Close modal"
      />

      {/* Modal - Compact design matching PageContextDisclosure style */}
      <div className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-default-200 bg-background p-5 shadow-xl">
        <div className="space-y-4">
          {/* Header */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-primary-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Consent</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <h2 className="text-sm font-semibold text-foreground">
                Consent Required
              </h2>
            </div>
            <p className="text-xs text-default-500 pl-6">
              Check the box below to enable {choiceLabel}
            </p>
          </div>

          {/* Data Access - What we need consent for */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wide text-default-400 pl-1">
              Data we access
            </p>
            <ul className="space-y-1.5 text-xs text-default-500 pl-1">
              <li className="flex items-center gap-2">
                <span className="text-primary-400">✓</span>
                <Tooltip
                  content="Page title, URL, and other context to understand where the file came from"
                  placement="top"
                  delay={200}
                >
                  <span className="cursor-help border-b border-dotted border-default-300">
                    Page data
                  </span>
                </Tooltip>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary-400">✓</span>
                <Tooltip
                  content="Analyzes downloaded files to generate descriptive, meaningful names"
                  placement="top"
                  delay={200}
                >
                  <span className="cursor-help border-b border-dotted border-default-300">
                    Downloaded file content
                  </span>
                </Tooltip>
              </li>
            </ul>
          </div>

          {/* Privacy info - Reassurances */}
          <div className="space-y-1.5 pt-2 border-t border-default-100">
            <p className="text-[10px] uppercase tracking-wide text-default-400 pl-1">
              Privacy
            </p>
            <ul className="space-y-1 text-xs text-default-500 pl-1">
              <li className="flex items-center gap-2">
                <span className="text-default-400">•</span>
                <span>
                  {choice === 'cloud'
                    ? 'Your data will be sent securely to Google Gemini'
                    : 'All processing happens on your device'}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-default-400">•</span>
                <span>Not stored after processing</span>
              </li>
            </ul>
          </div>

          {/* Consent Checkbox - Simple style */}
          <label
            htmlFor={checkboxId}
            className="flex items-center gap-2 cursor-pointer group pt-3 border-t border-default-100"
          >
            <input
              id={checkboxId}
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-xs text-default-600 group-hover:text-primary-600 transition-colors">
              I agree to let NewName read page info and downloads for AI
              renaming
              <span className="text-danger-500 ml-0.5">*</span>
            </span>
          </label>

          {/* Actions - Compact buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 rounded-lg border border-default-200 bg-background px-3 py-2 text-xs font-medium text-default-500 hover:bg-default-50 focus:outline-none focus:ring-2 focus:ring-default-300 focus:ring-offset-1 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={consentChecked ? onConfirm : onDecline}
              disabled={loading}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors disabled:opacity-50 ${
                consentChecked
                  ? 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500'
                  : 'bg-default-100 text-default-400 hover:bg-default-200 focus:ring-default-300'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-1.5">
                  <svg
                    className="h-3 w-3 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Saving...</span>
                </span>
              ) : consentChecked ? (
                `Enable ${choiceLabel}`
              ) : (
                'Skip AI'
              )}
            </button>
          </div>

          {/* Footer note - Subtle */}
          <p className="text-center text-[10px] text-default-400">
            You can change this anytime in Settings
          </p>
        </div>
      </div>
    </div>
  );
}
