/**
 * Facade hook that consolidates all popup state management
 * Provides a single entry point for all popup-related state and handlers
 */

import { useTheme } from '@heroui/use-theme';
import { useCallback, useEffect, useMemo } from 'react';
import { browser, type PublicPath } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type { HistoryItem } from '@/entrypoints/shared/history/types';
import type { AiModelId } from '@/entrypoints/shared/integrations/chrome-ai/model-status';
import type { AiModelSetupState } from '@/entrypoints/shared/integrations/chrome-ai/setup-state';
import type { InstantBaselineStrategy } from '@/entrypoints/shared/settings/settings';
import type {
  FileType,
  ProcessingMode,
} from '@/entrypoints/shared/settings/types';
import { getAppropriateTheme } from '@/entrypoints/shared/ui/theme-service';
import { useAiFeatureReminder } from './useAiFeatureReminder';
import { useAiModelStatus } from './useAiModelStatus';
import { useDownloadsAccess } from './useDownloadsAccess';
import { type HistoryFilter, useHistory } from './useHistory';
import { usePopupSettings } from './usePopupSettings';

/** Subset of cloud settings needed for popup validation */
interface CloudSettingsForPopup {
  enabled: boolean;
  apiKey: string | null;
}

/**
 * Parameters for determining AI model banner visibility
 */
interface AiBannerVisibilityParams {
  aiStatusChecked: boolean;
  aiStatuses: unknown | null;
  aiBlockingModels: AiModelId[];
  aiSetupCompletedAt: number | null;
  processingMode: ProcessingMode | null;
}

/**
 * Determines if the AI model setup banner should be shown
 *
 * The banner is shown when:
 * - AI status has been checked
 * - AI statuses are available
 * - There are blocking models that need setup
 * - AI setup has not been completed
 * - User is not in cloud-only mode (needs local models)
 */
export function shouldShowAiModelBanner({
  aiStatusChecked,
  aiStatuses,
  aiBlockingModels,
  aiSetupCompletedAt,
  processingMode,
}: AiBannerVisibilityParams): boolean {
  return (
    aiStatusChecked &&
    !!aiStatuses &&
    aiBlockingModels.length > 0 &&
    !aiSetupCompletedAt &&
    // Only show if user needs local models (auto or local mode, not cloud-only)
    processingMode !== 'cloud'
  );
}

/**
 * Parameters for determining if AI is enabled
 */
interface AiEnabledParams {
  aiSetupCompletedAt: number | null;
  cloudFunctional: boolean;
  aiStatusChecked: boolean;
}

/**
 * Determines if AI features are enabled
 *
 * AI is enabled if:
 * - Local AI setup is complete, OR
 * - Cloud mode is selected AND properly configured (enabled + API key), OR
 * - Status hasn't been checked yet (optimistic default)
 */
export function isAiEnabled({
  aiSetupCompletedAt,
  cloudFunctional,
  aiStatusChecked,
}: AiEnabledParams): boolean {
  return !!aiSetupCompletedAt || cloudFunctional || !aiStatusChecked;
}

/**
 * Downloads access state and handlers
 */
interface DownloadsAccessState {
  downloadsAccessChecked: boolean;
  hasDownloadsAccess: boolean | null;
  showOnboarding: boolean;
  accessCheckError: string | null;
  persistentAccessGranted: boolean;
  needsPersistentSetup: boolean;
  openOnboarding: () => void;
  openPersistentSetup: () => Promise<void>;
  handleOnboardingComplete: () => void;
}

/**
 * History state and handlers
 */
interface HistoryState {
  historyLoaded: boolean;
  historyFilter: HistoryFilter;
  setHistoryFilter: (filter: HistoryFilter) => void;
  filteredHistory: HistoryItem[];
  loadHistory: () => Promise<void>;
  upgradeCount: number;
  fileTypeCounts: Partial<Record<FileType, number>>;
}

/**
 * AI model status state
 */
interface AiModelState {
  aiStatusChecked: boolean;
  aiStatusError: string | null;
  aiSetupCompletedAt: number | null;
  aiLastSetupError: AiModelSetupState['lastError'] | null;
  localAiReady: boolean;
}

/**
 * Settings state and handlers
 */
interface SettingsState {
  strategy: InstantBaselineStrategy | null;
  processingMode: ProcessingMode | null;
  cloudSettings: CloudSettingsForPopup | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  savedAt: number | null;
  handleStrategyChange: (strategy: InstantBaselineStrategy) => Promise<void>;
}

/**
 * AI feature reminder state and handlers
 */
interface ReminderState {
  showReminder: boolean;
  handleTryAi: () => Promise<void>;
  handleRemindLater: () => void;
}

/**
 * Computed AI state
 */
interface ComputedAiState {
  aiEnabled: boolean;
  shouldShowAiBanner: boolean;
  cloudFunctional: boolean;
}

/**
 * Navigation handlers
 */
interface NavigationHandlers {
  handleOpenAiSetup: () => Promise<void>;
  handleOpenSettings: () => Promise<void>;
}

/**
 * Complete popup state returned by the facade hook
 */
export interface UsePopupStateResult {
  // Theme
  theme: string | undefined;

  // Downloads access
  downloadsAccess: DownloadsAccessState;

  // History
  history: HistoryState;

  // AI model status
  aiModel: AiModelState;

  // Settings
  settings: SettingsState;

  // AI feature reminder
  reminder: ReminderState;

  // Computed AI state
  computed: ComputedAiState;

  // Navigation handlers
  navigation: NavigationHandlers;
}

/**
 * Facade hook that consolidates all popup state management
 *
 * This hook:
 * - Initializes all required hooks
 * - Handles theme auto-detection on first load and daily reset
 * - Computes derived state (localAiReady, cloudFunctional, aiEnabled, shouldShowAiBanner)
 * - Provides navigation handlers
 */
export function usePopupState(): UsePopupStateResult {
  const { theme, setTheme } = useTheme();

  // Initialize all hooks
  const downloadsAccess = useDownloadsAccess();
  const historyHook = useHistory();
  const aiModelStatus = useAiModelStatus();
  const settingsHook = usePopupSettings(setTheme);

  // Compute derived state: Local AI is ready when status is checked and no blocking models
  const localAiReady = useMemo(
    () =>
      aiModelStatus.aiStatusChecked &&
      !!aiModelStatus.aiStatuses &&
      aiModelStatus.aiBlockingModels.length === 0,
    [
      aiModelStatus.aiStatusChecked,
      aiModelStatus.aiStatuses,
      aiModelStatus.aiBlockingModels,
    ],
  );

  // Compute derived state: Cloud AI is functional only when enabled AND has API key configured
  const cloudFunctional = useMemo(
    () =>
      settingsHook.processingMode === 'cloud' &&
      settingsHook.cloudSettings?.enabled === true &&
      !!settingsHook.cloudSettings?.apiKey,
    [settingsHook.processingMode, settingsHook.cloudSettings],
  );

  // Initialize AI feature reminder with localAiReady
  const reminderHook = useAiFeatureReminder({ localAiReady });

  // Auto-detect system theme on first load and daily reset
  useEffect(() => {
    const appropriateTheme = getAppropriateTheme(theme);
    if (appropriateTheme !== theme) {
      setTheme(appropriateTheme);
    }
  }, [theme, setTheme]);

  // Compute AI enabled state
  const aiEnabled = useMemo(
    () =>
      isAiEnabled({
        aiSetupCompletedAt: aiModelStatus.aiSetupCompletedAt,
        cloudFunctional,
        aiStatusChecked: aiModelStatus.aiStatusChecked,
      }),
    [
      aiModelStatus.aiSetupCompletedAt,
      cloudFunctional,
      aiModelStatus.aiStatusChecked,
    ],
  );

  // Compute banner visibility
  const shouldShowBanner = useMemo(
    () =>
      shouldShowAiModelBanner({
        aiStatusChecked: aiModelStatus.aiStatusChecked,
        aiStatuses: aiModelStatus.aiStatuses,
        aiBlockingModels: aiModelStatus.aiBlockingModels,
        aiSetupCompletedAt: aiModelStatus.aiSetupCompletedAt,
        processingMode: settingsHook.processingMode,
      }),
    [
      aiModelStatus.aiStatusChecked,
      aiModelStatus.aiStatuses,
      aiModelStatus.aiBlockingModels,
      aiModelStatus.aiSetupCompletedAt,
      settingsHook.processingMode,
    ],
  );

  // Navigation handlers
  const handleOpenAiSetup = useCallback(async () => {
    try {
      const url = browser.runtime.getURL(
        '/ai-mode-selection.html' as PublicPath,
      );
      await browser.tabs.create({ url });
    } catch (err) {
      debugLogger.error('Failed to open AI mode selection page', {
        error: err,
      });
    }
  }, []);

  const handleOpenSettings = useCallback(async () => {
    try {
      const url = browser.runtime.getURL('/settings.html' as PublicPath);
      await browser.tabs.create({ url });
    } catch (err) {
      debugLogger.error('Failed to open settings page', { error: err });
    }
  }, []);

  return {
    theme,

    downloadsAccess: {
      downloadsAccessChecked: downloadsAccess.downloadsAccessChecked,
      hasDownloadsAccess: downloadsAccess.hasDownloadsAccess,
      showOnboarding: downloadsAccess.showOnboarding,
      accessCheckError: downloadsAccess.accessCheckError,
      persistentAccessGranted: downloadsAccess.persistentAccessGranted,
      needsPersistentSetup: downloadsAccess.needsPersistentSetup,
      openOnboarding: downloadsAccess.openOnboarding,
      openPersistentSetup: downloadsAccess.openPersistentSetup,
      handleOnboardingComplete: downloadsAccess.handleOnboardingComplete,
    },

    history: {
      historyLoaded: historyHook.historyLoaded,
      historyFilter: historyHook.historyFilter,
      setHistoryFilter: historyHook.setHistoryFilter,
      filteredHistory: historyHook.filteredHistory,
      loadHistory: historyHook.loadHistory,
      upgradeCount: historyHook.upgradeCount,
      fileTypeCounts: historyHook.fileTypeCounts,
    },

    aiModel: {
      aiStatusChecked: aiModelStatus.aiStatusChecked,
      aiStatusError: aiModelStatus.aiStatusError,
      aiSetupCompletedAt: aiModelStatus.aiSetupCompletedAt,
      aiLastSetupError: aiModelStatus.aiLastSetupError,
      localAiReady,
    },

    settings: {
      strategy: settingsHook.strategy,
      processingMode: settingsHook.processingMode,
      cloudSettings: settingsHook.cloudSettings,
      loading: settingsHook.loading,
      saving: settingsHook.saving,
      error: settingsHook.error,
      savedAt: settingsHook.savedAt,
      handleStrategyChange: settingsHook.handleStrategyChange,
    },

    reminder: {
      showReminder: reminderHook.showReminder,
      handleTryAi: reminderHook.handleTryAi,
      handleRemindLater: reminderHook.handleRemindLater,
    },

    computed: {
      aiEnabled,
      shouldShowAiBanner: shouldShowBanner,
      cloudFunctional,
    },

    navigation: {
      handleOpenAiSetup,
      handleOpenSettings,
    },
  };
}
