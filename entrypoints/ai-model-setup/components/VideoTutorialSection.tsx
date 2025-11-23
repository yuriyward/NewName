import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import PlayCircleIcon from '@heroicons/react/24/outline/PlayCircleIcon';
import { type JSX, useState } from 'react';
import { ArcadeEmbed } from './ArcadeEmbed';

/**
 * Expandable video tutorial section showing how to enable Chrome AI flags.
 * Open by default to help users get started quickly.
 */
export function VideoTutorialSection(): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <section>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 rounded-lg border border-default-200 bg-white/60 px-4 py-3 text-left shadow-sm transition hover:border-default-300 hover:bg-white"
      >
        <PlayCircleIcon className="h-5 w-5 flex-shrink-0 text-default-500" />
        <span className="flex-1 text-sm font-semibold text-default-700">
          Check out the tutorial
        </span>
        {isExpanded ? (
          <ChevronDownIcon className="h-5 w-5 flex-shrink-0 text-default-400" />
        ) : (
          <ChevronRightIcon className="h-5 w-5 flex-shrink-0 text-default-400" />
        )}
      </button>

      {isExpanded ? (
        <div className="mt-2 overflow-hidden rounded-lg border border-default-200 bg-white/40 shadow-sm">
          <ArcadeEmbed />
          <p className="px-4 pb-2.5 pt-2 text-xs text-default-400">
            Watch this step-by-step guide to enable all required Chrome flags
            and configure the AI models.
          </p>
        </div>
      ) : null}
    </section>
  );
}
