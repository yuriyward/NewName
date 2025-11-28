/**
 * Video demonstration component for showing folder selection process
 * Designed to auto-play and loop seamlessly like a GIF
 */

import PlayCircleIcon from '@heroicons/react/24/outline/PlayCircleIcon';
import { type JSX, useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/entrypoints/shared/ui/Skeleton';

/**
 * HTMLMediaElement.readyState value indicating enough data is available
 * to start playback (HAVE_FUTURE_DATA or higher)
 * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState
 */
const VIDEO_READY_STATE_HAVE_FUTURE_DATA = 3;

interface VideoDemoProps {
  /**
   * Video source URL
   * - For videos in public folder: use browser.runtime.getURL('/videos/filename.mp4')
   * - For external hosting: use direct URL (e.g., GitHub releases, CDN)
   */
  src: string;
  /**
   * Optional poster image shown before video loads
   */
  poster?: string;
  /**
   * Video aspect ratio (default: 16/9)
   */
  aspectRatio?: number;
  /**
   * Optional accessibility label
   */
  ariaLabel?: string;
}

export function VideoDemo({
  src,
  poster,
  aspectRatio = 16 / 9,
  ariaLabel = 'Folder selection demonstration',
}: VideoDemoProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Validate aspectRatio to prevent division by zero or negative values
  const safeAspectRatio = aspectRatio > 0 ? aspectRatio : 16 / 9;

  // Warn in development mode when aspect ratio validation fails
  if (import.meta.env.DEV && aspectRatio <= 0) {
    console.warn(
      `[VideoDemo] Invalid aspectRatio: ${aspectRatio}. Using default 16/9.`,
    );
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadStart = () => {
      setIsLoading(true);
      setHasError(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setHasError(false);
    };

    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
    };

    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    // Try to play if already loaded
    if (video.readyState >= VIDEO_READY_STATE_HAVE_FUTURE_DATA) {
      handleCanPlay();
    }

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-default-100 shadow-lg">
      {/* Aspect ratio container */}
      <div
        className="relative w-full"
        style={{ paddingBottom: `${(1 / safeAspectRatio) * 100}%` }}
      >
        {/* Loading state with skeleton placeholder */}
        {isLoading && !hasError && (
          <div className="absolute inset-0">
            <Skeleton aspectRatio={safeAspectRatio} className="h-full w-full" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-foreground/60">
              <PlayCircleIcon className="h-12 w-12" />
              <p className="text-sm font-medium">Loading video...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-default-50 p-6">
            <div className="text-center">
              <p className="text-sm text-default-600">Video unavailable</p>
              <p className="mt-1 text-xs text-default-400">
                The demo video could not be loaded
              </p>
            </div>
          </div>
        )}

        {/* Direct video element */}
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          autoPlay
          loop
          muted
          playsInline
          className={`absolute inset-0 h-full w-full object-contain ${
            isLoading || hasError ? 'invisible' : 'visible'
          }`}
          aria-label={ariaLabel}
        />
      </div>

      {/* Subtle indicator that it's a looping demo */}
      {!isLoading && !hasError && (
        <div className="absolute bottom-3 right-3 rounded-full bg-black/20 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          Demo
        </div>
      )}
    </div>
  );
}
