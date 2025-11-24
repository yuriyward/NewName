import { useEffect, useRef, useState } from 'react';
import { MODEL_ETA } from '../constants';

interface ProgressSample {
  loaded: number;
  timestamp: number;
}

export interface DownloadETAInfo {
  eta: string | null;
  elapsedTime: string | null;
  downloadRate: number | null; // bytes per second
  isSlowNetwork: boolean;
}

const MIN_SAMPLES_FOR_DYNAMIC_ETA = 3;
const MAX_SAMPLES = 5;
const BYTES_PER_MB = 1024 * 1024;
const MIN_RATE_THRESHOLD = 0.01 * BYTES_PER_MB; // 10 KB/s minimum rate
const SLOW_NETWORK_THRESHOLD = 100 * 1024; // 100 KB/s - below this is considered slow
const MAX_REASONABLE_ETA_SECONDS = 3600; // 1 hour - fall back to static if ETA exceeds this

/**
 * Format elapsed time in a human-readable format
 */
function formatElapsedTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.floor(seconds)} sec`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return remainingSeconds > 0
    ? `${minutes} min ${remainingSeconds} sec`
    : `${minutes} min`;
}

/**
 * Custom hook for calculating dynamic download ETA with fallback to static estimates.
 *
 * Strategy:
 * - Collects progress samples with timestamps
 * - Calculates download rate using moving average
 * - Computes remaining time based on rate and bytes remaining
 * - Tracks elapsed time since download started
 * - Detects slow network conditions for improved UX messaging
 * - Falls back to static MODEL_ETA when calculation is unreliable
 * - Validates loaded < total to prevent negative ETA from API inconsistencies
 * - Validates ETA is reasonable (< 1 hour) to avoid displaying unrealistic values
 *
 * @param loaded - Bytes downloaded so far
 * @param total - Total bytes to download
 * @param modelId - Model identifier for static ETA fallback
 * @param isDownloading - Whether download is currently active
 * @returns Object with ETA, elapsed time, download rate, and slow network indicator
 */
export function useDownloadETA(
  loaded: number | undefined,
  total: number | undefined,
  modelId: string,
  isDownloading: boolean,
): DownloadETAInfo {
  const samplesRef = useRef<ProgressSample[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const [etaInfo, setEtaInfo] = useState<DownloadETAInfo>({
    eta: null,
    elapsedTime: null,
    downloadRate: null,
    isSlowNetwork: false,
  });

  useEffect(() => {
    // Reset samples and start time when download starts/stops
    if (!isDownloading) {
      samplesRef.current = [];
      startTimeRef.current = null;
      setEtaInfo({
        eta: null,
        elapsedTime: null,
        downloadRate: null,
        isSlowNetwork: false,
      });
      return;
    }

    // Track download start time
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }

    // Calculate elapsed time since download started
    const now = Date.now();
    const elapsedSeconds = startTimeRef.current
      ? (now - startTimeRef.current) / 1000
      : 0;
    const formattedElapsed =
      elapsedSeconds > 0 ? formatElapsedTime(elapsedSeconds) : null;

    // Need both loaded and total for calculation
    if (loaded === undefined || total === undefined || total === 0) {
      // Fall back to static ETA
      const staticEta = MODEL_ETA[modelId as keyof typeof MODEL_ETA];
      setEtaInfo({
        eta: staticEta || null,
        elapsedTime: formattedElapsed,
        downloadRate: null,
        isSlowNetwork: false,
      });
      return;
    }

    // Prevent negative ETA if loaded >= total (API inconsistencies or bugs)
    if (loaded >= total) {
      // Fall back to static ETA when download appears complete or inconsistent
      const staticEta = MODEL_ETA[modelId as keyof typeof MODEL_ETA];
      setEtaInfo({
        eta: staticEta || null,
        elapsedTime: formattedElapsed,
        downloadRate: null,
        isSlowNetwork: false,
      });
      return;
    }

    // Add current progress sample (skip duplicates to avoid rate calculation skew)
    if (samplesRef.current.length > 0) {
      const lastSample = samplesRef.current[samplesRef.current.length - 1];
      if (lastSample.loaded === loaded) {
        // Skip duplicate sample - loaded value hasn't changed
        return;
      }
    }
    samplesRef.current.push({ loaded, timestamp: now });

    // Keep only recent samples
    if (samplesRef.current.length > MAX_SAMPLES) {
      samplesRef.current.shift();
    }

    // Need minimum samples for reliable calculation
    if (samplesRef.current.length < MIN_SAMPLES_FOR_DYNAMIC_ETA) {
      const staticEta = MODEL_ETA[modelId as keyof typeof MODEL_ETA];
      setEtaInfo({
        eta: staticEta || null,
        elapsedTime: formattedElapsed,
        downloadRate: null,
        isSlowNetwork: false,
      });
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
      setEtaInfo({
        eta: staticEta || null,
        elapsedTime: formattedElapsed,
        downloadRate: null,
        isSlowNetwork: false,
      });
      return;
    }

    const rate = bytesDownloaded / timeElapsed; // bytes per second

    // Fall back to static if rate is too low (stalled or unstable)
    if (rate < MIN_RATE_THRESHOLD) {
      const staticEta = MODEL_ETA[modelId as keyof typeof MODEL_ETA];
      setEtaInfo({
        eta: staticEta || null,
        elapsedTime: formattedElapsed,
        downloadRate: rate,
        isSlowNetwork: rate > 0 && rate < SLOW_NETWORK_THRESHOLD,
      });
      return;
    }

    // Calculate remaining time
    const remaining = total - loaded;
    const secondsRemaining = remaining / rate;

    // Fall back to static if ETA is unrealistically large (very slow download)
    if (secondsRemaining > MAX_REASONABLE_ETA_SECONDS) {
      const staticEta = MODEL_ETA[modelId as keyof typeof MODEL_ETA];
      setEtaInfo({
        eta: staticEta || null,
        elapsedTime: formattedElapsed,
        downloadRate: rate,
        isSlowNetwork: rate > 0 && rate < SLOW_NETWORK_THRESHOLD,
      });
      return;
    }

    // Format as minutes or seconds
    let formattedEta: string;
    if (secondsRemaining < 60) {
      const seconds = Math.ceil(secondsRemaining);
      formattedEta = `~${seconds} sec left`;
    } else {
      const minutes = Math.ceil(secondsRemaining / 60);
      formattedEta = `~${minutes} min left`;
    }

    // Set complete ETA info with elapsed time and slow network detection
    setEtaInfo({
      eta: formattedEta,
      elapsedTime: formattedElapsed,
      downloadRate: rate,
      isSlowNetwork: rate > 0 && rate < SLOW_NETWORK_THRESHOLD,
    });
  }, [loaded, total, modelId, isDownloading]);

  return etaInfo;
}
