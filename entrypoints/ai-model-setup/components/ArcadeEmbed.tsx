import PlayCircleIcon from '@heroicons/react/24/outline/PlayCircleIcon';
import type { JSX } from 'react';
import { useState } from 'react';
import { Skeleton } from '@/entrypoints/shared/ui/Skeleton';

/**
 * Arcade demo embed showing how to enable Chrome's built-in AI flags
 * and configure on-device models for file renaming.
 */
export function ArcadeEmbed(): JSX.Element {
  const [isLoaded, setIsLoaded] = useState(false);

  // Arcade embed aspect ratio: 62.367724867724874% = 100/62.367... ≈ 1.6034
  const aspectRatio = 100 / 62.367724867724874;

  return (
    <div
      style={{
        position: 'relative',
        paddingBottom: 'calc(62.367724867724874%)',
        height: '0',
        width: '100%',
      }}
    >
      {!isLoaded && (
        <div className="absolute inset-0">
          <Skeleton aspectRatio={aspectRatio} className="w-full" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-foreground/60">
            <PlayCircleIcon className="h-12 w-12" />
            <p className="text-sm font-medium">Loading tutorial...</p>
          </div>
        </div>
      )}
      <iframe
        src="https://demo.arcade.software/iow4OOSfK6xdBOYLVDpx?embed&embed_mobile=inline&embed_desktop=inline&show_copy_link=true"
        title="Enable On-Device AI Models for Smarter File Names in Chrome"
        frameBorder="0"
        loading="lazy"
        allowFullScreen
        allow="clipboard-write"
        onLoad={() => setIsLoaded(true)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          colorScheme: 'light',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
        }}
      />
    </div>
  );
}
