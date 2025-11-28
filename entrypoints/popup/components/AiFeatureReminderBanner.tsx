/**
 * Periodic reminder banner for users in manual mode
 * Shows after 3 days to encourage trying AI features
 */
import { SparklesIcon } from '@heroicons/react/24/outline';
import { Alert } from '@heroui/alert';
import type { JSX } from 'react';
import { PrimaryButton } from './PrimaryButton';

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
    <Alert
      color="secondary"
      variant="flat"
      className="mb-3 text-xs relative"
      icon={<SparklesIcon className="size-4 text-secondary-500" />}
    >
      <div className="space-y-2">
        <div className="space-y-1">
          <p className="font-semibold text-secondary-700">
            Ready to try smarter file names?
          </p>
          <p className="text-default-600">
            AI can automatically give your downloads meaningful names based on
            their content. Your data stays private.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <PrimaryButton onClick={onTryAi} className="text-xs">
            Enable AI Features
          </PrimaryButton>
          <button
            type="button"
            onClick={onRemindLater}
            className="text-[11px] text-default-400 hover:text-default-600 underline"
          >
            Remind me later
          </button>
        </div>
      </div>
    </Alert>
  );
}
