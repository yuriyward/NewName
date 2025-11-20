import { browser } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  getHistoryItem,
  updateHistoryItem,
} from '@/entrypoints/shared/history/history';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import { shouldAnalyzeUpgrade } from './eligibility';
import {
  MOCK_UPGRADE_ALARM_PREFIX,
  type ScheduleUpgradeAnalysisParams,
} from './types';
import type { ProcessUpgradeAnalysisParams } from './upgrade-processor';

type AlarmCallback = Parameters<typeof browser.alarms.onAlarm.addListener>[0];
export type BrowserAlarm = Parameters<AlarmCallback>[0];

export interface UpgradeSchedulerDependencies {
  now: () => number;
  readSettings: () => Settings;
  processAnalysis: (params: ProcessUpgradeAnalysisParams) => Promise<void>;
}

export interface UpgradeScheduler {
  scheduleMockAnalysis(params: ScheduleUpgradeAnalysisParams): Promise<void>;
  handleAlarm(alarm: BrowserAlarm): Promise<boolean>;
  cleanupOrphanedAlarms(): Promise<void>;
}

export function createUpgradeScheduler(
  deps: UpgradeSchedulerDependencies,
): UpgradeScheduler {
  const { now: nowFn, readSettings, processAnalysis } = deps;
  const MOCK_ANALYSIS_DELAY_MS = 5_000;

  async function scheduleMockAnalysis({
    historyId,
    downloadId,
  }: ScheduleUpgradeAnalysisParams): Promise<void> {
    // Eligibility (file type, cooldowns, etc.) is enforced upstream in upgrade/eligibility.ts.
    // By the time we reach the scheduler we simply need a download id to attach the alarm.
    if (downloadId === undefined) {
      // No downloadId available yet - handleDownloadChange will trigger the immediate
      // analysis path once Chrome assigns one, so we skip creating an alarm here.
      debugLogger.log(
        '[UpgradeScheduler] Skipping scheduled analysis (no download id), will use immediate path',
        { historyId },
      );
      return;
    }

    const now = nowFn();
    try {
      const updated = await updateHistoryItem(historyId, (item) => ({
        ...item,
        pendingUpgradeAnalysis: {
          downloadId,
          scheduledAt: now,
          reason: 'mock-delayed-upgrade',
        },
      }));

      if (!updated) {
        debugLogger.warn(
          '[UpgradeScheduler] Failed to store pending mock analysis',
          { historyId },
        );
        return;
      }

      const alarmName = `${MOCK_UPGRADE_ALARM_PREFIX}${historyId}`;
      await browser.alarms.create(alarmName, {
        delayInMinutes: MOCK_ANALYSIS_DELAY_MS / 60_000,
      });

      debugLogger.log('[UpgradeScheduler] Mock analysis scheduled', {
        historyId,
        downloadId,
        alarmName,
      });
    } catch (error) {
      debugLogger.error(
        '[UpgradeScheduler] Failed to schedule mock upgrade analysis',
        { historyId, error },
      );
    }
  }

  async function handleAlarm(alarm: BrowserAlarm): Promise<boolean> {
    if (!alarm.name.startsWith(MOCK_UPGRADE_ALARM_PREFIX)) {
      return false;
    }
    const historyId = alarm.name.slice(MOCK_UPGRADE_ALARM_PREFIX.length);
    const now = nowFn();
    const settings = readSettings();

    const historyItem = await getHistoryItem(historyId);
    if (!historyItem) {
      debugLogger.warn('[UpgradeScheduler] Alarm fired for missing history', {
        historyId,
      });
      return true;
    }

    const pending = historyItem.pendingUpgradeAnalysis;
    if (!pending) {
      debugLogger.log(
        '[UpgradeScheduler] No pending upgrade analysis for alarm',
        historyId,
      );
      return true;
    }

    // Check eligibility before running analysis to prevent race conditions.
    // This prevents AI analysis from overwriting metadata upgrades (like MediaInfo results)
    // that completed after the alarm was scheduled (5s earlier) but before it fired.
    // Without this check, scheduled AI analysis could run and overwrite good metadata.
    if (!shouldAnalyzeUpgrade(historyItem, settings, now, 'scheduler')) {
      debugLogger.log(
        '[UpgradeScheduler] Skipping scheduled analysis (ineligible)',
        {
          historyId,
          hasMetadataUpgrade: historyItem.upgrade?.source === 'metadata',
          strategy: settings.instantBaselineStrategy,
        },
      );
      // Clear pending state since we're not running the analysis
      await updateHistoryItem(historyId, (item) => ({
        ...item,
        pendingUpgradeAnalysis: undefined,
      }));
      return true;
    }

    const downloadId = pending.downloadId;

    await processAnalysis({
      historyId,
      downloadId,
      settings,
      now,
      historyItem,
    });

    return true;
  }

  async function cleanupOrphanedAlarms(): Promise<void> {
    try {
      const alarms = await browser.alarms.getAll();
      const upgradeAlarms = alarms.filter((alarm) =>
        alarm.name.startsWith(MOCK_UPGRADE_ALARM_PREFIX),
      );

      await Promise.all(
        upgradeAlarms.map(async (alarm) => {
          const historyId = alarm.name.slice(MOCK_UPGRADE_ALARM_PREFIX.length);
          const historyItem = await getHistoryItem(historyId);
          if (!historyItem?.pendingUpgradeAnalysis) {
            await browser.alarms.clear(alarm.name);
            debugLogger.log(
              '[UpgradeScheduler] Cleared orphaned upgrade alarm',
              {
                alarmName: alarm.name,
                historyId,
              },
            );
          }
        }),
      );
    } catch (error) {
      debugLogger.error('[UpgradeScheduler] Failed to cleanup upgrade alarms', {
        error,
      });
    }
  }

  return {
    scheduleMockAnalysis,
    handleAlarm,
    cleanupOrphanedAlarms,
  };
}
