/**
 * Type definitions for contextual upgrade pipeline
 */
import type {
  HistoryItem,
  UpgradeProposal,
} from '@/entrypoints/shared/history/types';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import type { ConfirmToastController } from '../toast/confirmation-controller';

/**
 * Minimal subset of download item fields used by the upgrade pipeline.
 * Keeps us decoupled from the full browser typings until we wire the real APIs.
 */
export interface BrowserDownloadItem {
  id: number;
  filename?: string;
  totalBytes?: number;
  bytesReceived: number;
  state?: string;
  url?: string;
}

export const MOCK_UPGRADE_ALARM_PREFIX = 'mock-upgrade-';

export interface BrowserDownloadDelta {
  id: number;
  state?: {
    current?: string;
    previous?: string;
  };
}

export interface UpgradeAnalysisInput {
  downloadId: number;
  downloadItem: BrowserDownloadItem;
  historyItem: HistoryItem;
  settings: Settings;
  now: number;
}

export interface ScheduleUpgradeAnalysisParams {
  historyId: string;
  downloadId?: number;
  /**
   * File type filtering happens inside eligibility.ts before scheduling.
   * The field remains optional for callers that still provide it for logging.
   */
  fileType?: HistoryItem['fileType'];
}

export interface UpgradeCoordinatorParams {
  confirmToastController: ConfirmToastController;
  readSettings: () => Settings;
  requestAnalysis?: (
    input: UpgradeAnalysisInput,
  ) => Promise<UpgradeProposal | null>;
  now?: () => number;
}
