import { useEffect, useRef, useState } from 'react';
import {
  calculateDownloadETA,
  type ProgressSample,
} from '../utils/download-eta-calculator';

export interface DownloadETAInfo {
  eta: string | null;
  elapsedTime: string | null;
  downloadRate: number | null; // bytes per second
  isSlowNetwork: boolean;
}

/**
 * Custom hook for calculating dynamic download ETA with fallback to static estimates.
 *
 * This hook is a thin React wrapper around the pure calculateDownloadETA function.
 * All calculation logic lives in download-eta-calculator.ts for testability.
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

    const now = Date.now();

    // Calculate ETA using pure function
    // Use fallback values if loaded/total are undefined
    const result = calculateDownloadETA(
      {
        loaded: loaded ?? 0,
        total: total ?? 0,
        modelId,
        samples: samplesRef.current,
        startTime: startTimeRef.current ?? now,
      },
      now,
    );

    // Update samples ref if a new sample was added
    if (result.shouldAddSample && result.newSamples) {
      samplesRef.current = result.newSamples;
    }

    // Update state with new ETA info
    setEtaInfo({
      eta: result.eta,
      elapsedTime: result.elapsedTime,
      downloadRate: result.downloadRate,
      isSlowNetwork: result.isSlowNetwork,
    });
  }, [loaded, total, modelId, isDownloading]);

  return etaInfo;
}
