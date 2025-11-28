/**
 * Periodic reminder banner for users in manual mode
 * Shows after 3 days to encourage trying AI features
 */
import { ArrowRightIcon, SparklesIcon } from '@heroicons/react/20/solid';
import type { JSX } from 'react';

interface AiFeatureReminderBannerProps {
  /** Whether the banner should be visible */
  visible: boolean;
  /** Callback when user clicks "Try AI Features" */
  onTryAi: () => void;
  /** Callback when user clicks "Remind me later" (snoozes for cooldown period) */
  onRemindLater: () => void;
}

/**
 * Gentle reminder banner shown to users who declined AI features
 * Appears after 3 days in manual mode to encourage trying AI
 */
export function AiFeatureReminderBanner({
  visible,
  onTryAi,
  onRemindLater,
}: AiFeatureReminderBannerProps): JSX.Element | null {
  if (!visible) return null;

  return (
    <div className="mb-3 rounded-lg overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-yellow-950/20 border border-amber-200/60 dark:border-amber-800/40">
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Icon container with gradient */}
          <div className="shrink-0 size-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
            <SparklesIcon className="size-5 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Ready to try smarter names?
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              AI renames your downloads automatically. Private and on-device.
            </p>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={onTryAi}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-md shadow-sm transition-all duration-200 cursor-pointer"
              >
                Enable AI
                <ArrowRightIcon className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={onRemindLater}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
