import { useEffect, useRef, useState } from 'react';
import { MODEL_ETA } from '../constants';

interface ProgressSample {
  loaded: number;
  timestamp: number;
}

const MIN_SAMPLES_FOR_DYNAMIC_ETA = 3;
const MAX_SAMPLES = 5;
const BYTES_PER_MB = 1024 * 1024;
const MIN_RATE_THRESHOLD = 0.01 * BYTES_PER_MB; // 10 KB/s minimum rate

/**
 * Custom hook for calculating dynamic download ETA with fallback to static estimates.
 *
 * Strategy:
 * - Collects progress samples with timestamps
 * - Calculates download rate using moving average
 * - Computes remaining time based on rate and bytes remaining
 * - Falls back to static MODEL_ETA when calculation is unreliable
 *
 * @param loaded - Bytes downloaded so far
 * @param total - Total bytes to download
 * @param modelId - Model identifier for static ETA fallback
 * @param isDownloading - Whether download is currently active
 * @returns Formatted ETA string (e.g., "~3 min left") or null
 */
export function useDownloadETA(
  loaded: number | undefined,
  total: number | undefined,
  modelId: string,
  isDownloading: boolean,
): string | null {
  const samplesRef = useRef<ProgressSample[]>([]);
  const [eta, setEta] = useState<string | null>(null);

  useEffect(() => {
    // Reset samples when download starts/stops
    if (!isDownloading) {
      samplesRef.current = [];
      setEta(null);
      return;
    }

    // Need both loaded and total for calculation
    if (loaded === undefined || total === undefined || total === 0) {
      // Fall back to static ETA
      const staticEta = MODEL_ETA[modelId as keyof typeof MODEL_ETA];
      setEta(staticEta || null);
      return;
    }

    // Add current progress sample
    const now = Date.now();
    samplesRef.current.push({ loaded, timestamp: now });

    // Keep only recent samples
    if (samplesRef.current.length > MAX_SAMPLES) {
      samplesRef.current.shift();
    }

    // Need minimum samples for reliable calculation
    if (samplesRef.current.length < MIN_SAMPLES_FOR_DYNAMIC_ETA) {
      const staticEta = MODEL_ETA[modelId as keyof typeof MODEL_ETA];
      setEta(staticEta || null);
      return;
    }

    // Calculate average download rate
    const samples = samplesRef.current;
    const oldestSample = samples[0];
    const newestSample = samples[samples.length - 1];

    const bytesDownloaded = newestSample.loaded - oldestSample.loaded;
    const timeElapsed =
      (newestSample.timestamp - oldestSample.timestamp) / 1000; // seconds

    if (timeElapsed === 0) {
      const staticEta = MODEL_ETA[modelId as keyof typeof MODEL_ETA];
      setEta(staticEta || null);
      return;
    }

    const rate = bytesDownloaded / timeElapsed; // bytes per second

    // Fall back to static if rate is too low (stalled or unstable)
    if (rate < MIN_RATE_THRESHOLD) {
      const staticEta = MODEL_ETA[modelId as keyof typeof MODEL_ETA];
      setEta(staticEta || null);
      return;
    }

    // Calculate remaining time
    const remaining = total - loaded;
    const secondsRemaining = remaining / rate;

    // Format as minutes or seconds
    let formattedEta: string;
    if (secondsRemaining < 60) {
      const seconds = Math.ceil(secondsRemaining);
      formattedEta = `~${seconds} sec left`;
    } else {
      const minutes = Math.ceil(secondsRemaining / 60);
      formattedEta = `~${minutes} min left`;
    }

    setEta(formattedEta);
  }, [loaded, total, modelId, isDownloading]);

  return eta;
}
