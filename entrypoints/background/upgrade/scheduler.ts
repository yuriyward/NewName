import { browser } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  getHistoryItem,
  updateHistoryItem,
} from '@/entrypoints/shared/history/history';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import type { ProcessUpgradeAnalysisParams } from './executor';
import {
  MOCK_UPGRADE_ALARM_PREFIX,
  type ScheduleUpgradeAnalysisParams,
} from './types';

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
    fileType,
  }: ScheduleUpgradeAnalysisParams): Promise<void> {
    if (fileType !== 'pdf') {
      return;
    }
    if (downloadId === undefined) {
      debugLogger.warn(
        '[UpgradeScheduler] Cannot schedule mock analysis without download id',
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
