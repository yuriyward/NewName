import PlayCircleIcon from '@heroicons/react/24/outline/PlayCircleIcon';
import type { JSX } from 'react';
import { ArcadeEmbed } from './ArcadeEmbed';

/**
 * Video tutorial section showing how to enable Chrome AI flags.
 * Always visible to provide onboarding guidance.
 */
export function VideoTutorialSection(): JSX.Element {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <PlayCircleIcon className="h-5 w-5 shrink-0 text-accent-600" />
        <h2 className="text-sm font-semibold text-default-700">Tutorial</h2>
      </div>

      <div className="overflow-hidden rounded-lg border border-default-200 bg-white/40 shadow-sm">
        <ArcadeEmbed />
        <p className="px-4 pb-2.5 pt-2 text-xs text-default-400">
          Watch this step-by-step guide on setting up Chrome for local AI
          models.
        </p>
      </div>
    </section>
  );
}
