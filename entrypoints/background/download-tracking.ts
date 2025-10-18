/**
 * Download tracking helpers used by the background coordinator.
 */
import type { MediaDebugSettings } from '@/entrypoints/shared/integrations/mediainfo/debug';

export interface DownloadTrackingEntry {
  historyId: string;
  debug?: MediaDebugSettings;
  url: string;
  filename: string;
  createdAt: number;
  tabId?: number;
}

const DOWNLOAD_TRACKING_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const DOWNLOAD_TRACKING_MAX_ENTRIES = 200;
const DOWNLOAD_TRACKING_PRUNE_EVERY_N_ADDITIONS = 50;

let additionsSinceLastPrune = 0;

export function pruneDownloadTrackingMap(
  map: Map<number, DownloadTrackingEntry>,
  now = Date.now(),
): void {
  for (const [id, entry] of map) {
    if (now - entry.createdAt > DOWNLOAD_TRACKING_TTL_MS) {
      map.delete(id);
    }
  }

  if (map.size <= DOWNLOAD_TRACKING_MAX_ENTRIES) {
    return;
  }

  const entries = Array.from(map.entries()).sort(
    (a, b) => a[1].createdAt - b[1].createdAt,
  );
  const excess = map.size - DOWNLOAD_TRACKING_MAX_ENTRIES;
  for (let index = 0; index < excess; index += 1) {
    const entry = entries[index];
    if (entry && entry[0] !== undefined) {
      map.delete(entry[0]);
    }
  }
}

export function recordDownloadTracking(
  map: Map<number, DownloadTrackingEntry>,
  downloadId: number,
  entry: DownloadTrackingEntry,
  now = Date.now(),
): void {
  map.set(downloadId, entry);
  additionsSinceLastPrune += 1;
  if (additionsSinceLastPrune >= DOWNLOAD_TRACKING_PRUNE_EVERY_N_ADDITIONS) {
    pruneDownloadTrackingMap(map, now);
    additionsSinceLastPrune = 0;
  }
}

export function resetDownloadTrackingForTesting(): void {
  additionsSinceLastPrune = 0;
}
