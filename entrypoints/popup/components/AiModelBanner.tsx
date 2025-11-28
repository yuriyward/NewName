import { ArrowRightIcon, SparklesIcon } from '@heroicons/react/20/solid';
import type { AiModelSetupState } from '@/entrypoints/shared/integrations/chrome-ai/setup-state';

interface AiModelBannerProps {
  visible: boolean;
  lastError: AiModelSetupState['lastError'] | null;
  onEnableAi: () => void;
}

const AiModelBanner = ({
  visible,
  lastError,
  onEnableAi,
}: AiModelBannerProps) => {
  if (!visible) return null;

  return (
    <div className="mb-3 rounded-lg overflow-hidden bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50 dark:from-violet-950/40 dark:via-blue-950/30 dark:to-cyan-950/20 border border-violet-200/60 dark:border-violet-800/40">
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Icon container with gradient */}
          <div className="shrink-0 size-9 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-sm">
            <SparklesIcon className="size-5 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <h3 className="text-sm font-semibold text-violet-900 dark:text-violet-100">
              Enable smarter file names
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Let AI turn messy downloads into clear, descriptive names.
            </p>

            {lastError ? (
              <p className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded">
                Setup issue: {lastError.message}
              </p>
            ) : null}

            {/* CTA Button */}
            <button
              type="button"
              onClick={onEnableAi}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 rounded-md shadow-sm transition-all duration-200 cursor-pointer"
            >
              Set up AI renaming
              <ArrowRightIcon className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiModelBanner;
