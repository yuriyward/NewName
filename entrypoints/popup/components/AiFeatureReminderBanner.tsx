/**
 * Periodic reminder banner for users in manual mode
 * Shows after 3 days to encourage trying AI features
 */
import { SparklesIcon } from '@heroicons/react/20/solid';
import type { JSX } from 'react';
import { BannerActions } from './promo-banner/BannerActions';
import { BannerContainer } from './promo-banner/BannerContainer';
import { BannerContent } from './promo-banner/BannerContent';
import { BannerIcon } from './promo-banner/BannerIcon';
import { amberTheme } from './promo-banner/banner-themes';

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
    <BannerContainer theme={amberTheme}>
      <BannerIcon icon={SparklesIcon} theme={amberTheme} />
      <BannerContent
        title="Ready to try smarter names?"
        description="AI renames your downloads automatically. Private and on-device."
        theme={amberTheme}
      >
        <BannerActions
          primaryLabel="Enable AI"
          onPrimaryClick={onTryAi}
          theme={amberTheme}
          secondaryLabel="Later"
          onSecondaryClick={onRemindLater}
        />
      </BannerContent>
    </BannerContainer>
  );
}
