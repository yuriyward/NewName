/**
 * Applies metadata-based upgrade proposals
 * Entry point for metadata upgrades from UI interactions
 */

import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { getHistoryItem } from '@/entrypoints/shared/history/history';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import type { DownloadTrackingEntry } from '../download-tracking';
import {
  type HandleUpgradeProposalDeps,
  handleUpgradeProposal,
} from './handleUpgradeProposal';

export interface ApplyMetadataUpgradeParams {
  historyId: string;
  downloadId?: number;
  resolveTracking?: () => DownloadTrackingEntry | undefined;
}

export interface ApplyMetadataUpgradeDeps extends HandleUpgradeProposalDeps {
  readSettings: () => Settings;
}

export async function applyMetadataUpgrade(
  { historyId, downloadId, resolveTracking }: ApplyMetadataUpgradeParams,
  deps: ApplyMetadataUpgradeDeps,
): Promise<void> {
  const { readSettings } = deps;
  const settings = readSettings();
  const historyItem = await getHistoryItem(historyId);
  if (!historyItem) {
    debugLogger.warn(
      '[UpgradeCoordinator] Missing history for metadata upgrade',
      {
        historyId,
      },
    );
    return;
  }
  const proposal = historyItem.upgrade;
  if (!proposal || proposal.source !== 'metadata') {
    debugLogger.log(
      '[UpgradeCoordinator] No metadata upgrade available for application',
      { historyId },
    );
    return;
  }

  const resolvedDownloadId =
    typeof downloadId === 'number'
      ? downloadId
      : typeof historyItem.downloadId === 'number'
        ? historyItem.downloadId
        : undefined;

  if (resolvedDownloadId === undefined) {
    debugLogger.warn(
      '[UpgradeCoordinator] Cannot apply metadata upgrade without download id',
      { historyId },
    );
    return;
  }

  const tracking = resolveTracking?.();

  await handleUpgradeProposal(
    {
      proposal,
      historyId,
      historyItem,
      downloadId: resolvedDownloadId,
      settings,
      tracking,
      source: 'metadata',
    },
    deps,
  );
}
