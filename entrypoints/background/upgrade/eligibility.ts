/**
 * Eligibility checks for contextual upgrade analysis
 */
import type { HistoryItem } from '@/entrypoints/shared/history/types';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import { isMediaFileType } from '../download-utils';
import type { UpgradeAnalysisSource } from './types';

/**
 * Cooldown used to avoid re-running contextual upgrades immediately after a decision.
 * Fifteen minutes matches the typical download session length we observed in telemetry,
 * balancing responsiveness against redundant re-analysis.
 */
const UPGRADE_RECENT_WINDOW_MS = 15 * 60 * 1_000;

export function shouldAnalyzeUpgrade(
  historyItem: HistoryItem,
  settings: Settings,
  now: number,
  source: UpgradeAnalysisSource = 'immediate',
): boolean {
  // When the user explicitly disables renaming, skip contextual upgrades.
  if (settings.instantBaselineStrategy === 'keep-original') {
    return false;
  }

  // If a metadata-based upgrade already exists, skip AI analysis.
  // Metadata upgrades are deterministic and ready to apply - no need for further AI processing.
  // This prevents AI analysis from overwriting good metadata upgrades.
  // See also: scheduler deferral logic (lines 35-44) which gives MediaInfo time to complete
  // before AI analysis runs, helping metadata upgrades land first.
  const hasMetadataUpgrade = historyItem.upgrade?.source === 'metadata';
  if (hasMetadataUpgrade) {
    return false;
  }

  // When MediaInfo specs are enabled we defer media files to the scheduler
  // (5s delay) so MediaInfo results can land first. If MediaInfo fails the
  // scheduled path will proceed and act as the fallback.
  if (
    source === 'immediate' &&
    settings.metadataToggles.mediaSpecs &&
    isMediaFileType(historyItem.fileType)
  ) {
    return false;
  }

  // Check behavior setting
  if (settings.perType[historyItem.fileType]?.behavior === 'off') {
    return false;
  }

  // Check perfect confidence
  if (
    historyItem.decision?.outcome === 'rename' &&
    historyItem.decision.confidence === 100
  ) {
    return false;
  }

  // Check recent upgrade window
  if (historyItem.upgrade) {
    const age = now - historyItem.upgrade.generatedAt;
    if (age < UPGRADE_RECENT_WINDOW_MS) {
      return false;
    }
  }

  return true;
}

export { UPGRADE_RECENT_WINDOW_MS };
