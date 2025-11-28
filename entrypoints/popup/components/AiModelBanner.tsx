/**
 * Banner prompting users to set up AI-powered file renaming.
 * Shown when AI features are available but not yet configured.
 */
import { SparklesIcon } from '@heroicons/react/20/solid';
import type { JSX } from 'react';
import type { AiModelSetupState } from '@/entrypoints/shared/integrations/chrome-ai/setup-state';
import { BannerActions } from './promo-banner/BannerActions';
import { BannerContainer } from './promo-banner/BannerContainer';
import { BannerContent } from './promo-banner/BannerContent';
import { BannerIcon } from './promo-banner/BannerIcon';
import { violetTheme } from './promo-banner/banner-themes';

interface AiModelBannerProps {
  visible: boolean;
  lastError: AiModelSetupState['lastError'] | null;
  onEnableAi: () => void;
}

/**
 * Error message component for displaying setup issues.
 */
function ErrorMessage({ message }: { message: string }): JSX.Element {
  return (
    <p className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded">
      Setup issue: {message}
    </p>
  );
}

/**
 * Banner encouraging users to enable AI-powered file renaming.
 * Displays setup errors if present.
 */
function AiModelBanner({
  visible,
  lastError,
  onEnableAi,
}: AiModelBannerProps): JSX.Element | null {
  if (!visible) return null;

  return (
    <BannerContainer theme={violetTheme}>
      <BannerIcon icon={SparklesIcon} theme={violetTheme} />
      <BannerContent
        title="Enable smarter file names"
        description="Let AI turn messy downloads into clear, descriptive names."
        theme={violetTheme}
      >
        {lastError ? <ErrorMessage message={lastError.message} /> : null}
        <BannerActions
          primaryLabel="Set up AI renaming"
          onPrimaryClick={onEnableAi}
          theme={violetTheme}
        />
      </BannerContent>
    </BannerContainer>
  );
}

export default AiModelBanner;
