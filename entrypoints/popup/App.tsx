/**
 * Settings popup for configuring deterministic Instant Baseline strategies
 */

import { Alert } from '@heroui/alert';
import { Chip } from '@heroui/chip';
import { Skeleton } from '@heroui/skeleton';
import { Tab, Tabs } from '@heroui/tabs';
import { useTheme } from '@heroui/use-theme';
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import { browser, type PublicPath } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type { AiModelId } from '@/entrypoints/shared/integrations/chrome-ai/model-status';
import { STRATEGY_OPTIONS } from '@/entrypoints/shared/pipeline/strategy-options';
import { IconMoon, IconSun } from '@/entrypoints/shared/ui/icons';
import { getAppropriateTheme } from '@/entrypoints/shared/ui/theme-service';
import AiModelBanner from './components/AiModelBanner';
import HistoryTab from './components/HistoryTab';
import StrategyTab from './components/StrategyTab';
import { describeAiState, useAiModelStatus } from './hooks/useAiModelStatus';
import { useDownloadsAccess } from './hooks/useDownloadsAccess';
import { useHistory } from './hooks/useHistory';
import { usePopupSettings } from './hooks/usePopupSettings';
import { DownloadsAccessScreen } from './onboarding/DownloadsAccessScreen';

const AI_MODEL_LABELS: Record<AiModelId, string> = {
  'language-model': 'Prompt API (Gemini Nano)',
  summarizer: 'Summarizer API',
  'language-detector': 'Language Detector API',
};

function App(): JSX.Element {
  const { theme, setTheme } = useTheme();
  const {
    downloadsAccessChecked,
    hasDownloadsAccess,
    showOnboarding,
    accessCheckError,
    openOnboarding,
    handleOnboardingComplete,
    handleOnboardingSkip,
  } = useDownloadsAccess();
  const {
    historyLoaded,
    historyFilter,
    setHistoryFilter,
    filteredHistory,
    loadHistory,
    upgradeCount,
  } = useHistory();
  const {
    aiStatuses,
    aiStatusChecked,
    aiStatusError,
    aiSetupCompletedAt,
    aiLastSetupError,
    aiBlockingModels,
  } = useAiModelStatus();
  const {
    strategy,
    loading,
    saving,
    error,
    savedAt,
    handleStrategyChange,
    updateThemePreference,
  } = usePopupSettings(setTheme);

  // Auto-detect system theme on first load and daily reset
  useEffect(() => {
    const appropriateTheme = getAppropriateTheme(theme);
    if (appropriateTheme !== theme) {
      setTheme(appropriateTheme);
    }
  }, [theme, setTheme]);

  const options = STRATEGY_OPTIONS;

  const aiBannerDetails = useMemo(() => {
    if (!aiStatuses) return [];
    return aiBlockingModels.map((id) => ({
      id,
      description: `${AI_MODEL_LABELS[id]} — ${describeAiState(
        aiStatuses[id].state,
      )}`,
      requiresUserActivation: aiStatuses[id].requiresUserActivation,
    }));
  }, [aiBlockingModels, aiStatuses]);

  const shouldShowAiBanner =
    aiStatusChecked &&
    !!aiStatuses &&
    aiBlockingModels.length > 0 &&
    !aiSetupCompletedAt;

  const handleOpenAiSetup = useCallback(async () => {
    try {
      const url = browser.runtime.getURL('/ai-model-setup.html' as PublicPath);
      await browser.tabs.create({ url });
    } catch (err) {
      debugLogger.error('Failed to open AI model setup page', { error: err });
    }
  }, []);

  if (!downloadsAccessChecked) {
    return (
      <div className="w-96 p-3 bg-background text-foreground">
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="w-96 p-3 bg-background text-foreground">
        <DownloadsAccessScreen
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      </div>
    );
  }

  return (
    <div className="w-96 p-3 bg-background text-foreground relative">
      {/* Dark Mode Toggle */}
      <button
        type="button"
        onClick={() => {
          const newTheme = theme === 'dark' ? 'light' : 'dark';
          void updateThemePreference(newTheme);
        }}
        className="absolute top-2 right-2 z-20 w-7 h-7 rounded-sm bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-zinc-900 transition-all cursor-pointer"
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? (
          <IconSun className="w-4 h-4" />
        ) : (
          <IconMoon className="w-4 h-4" />
        )}
      </button>

      {/* Floating Saved Chip */}
      {!saving && savedAt !== null && (
        <Chip
          color="success"
          variant="flat"
          size="sm"
          className="absolute top-2 right-10 z-10 text-xs animate-in fade-in slide-in-from-top-2 duration-300"
        >
          Saved
        </Chip>
      )}

      <header className="mb-3">
        <h1 className="text-lg font-semibold">NewName</h1>
      </header>

      {accessCheckError ? (
        <Alert color="warning" variant="flat" className="mb-3 text-xs">
          {accessCheckError}
        </Alert>
      ) : null}

      {aiStatusError ? (
        <Alert
          color="warning"
          variant="flat"
          className="mb-3 text-xs space-y-1"
        >
          <p>Unable to check AI model status.</p>
          <p>{aiStatusError}</p>
        </Alert>
      ) : null}

      <AiModelBanner
        visible={shouldShowAiBanner}
        details={aiBannerDetails}
        lastError={aiLastSetupError}
        onEnableAi={handleOpenAiSetup}
      />

      {hasDownloadsAccess === false ? (
        <Alert
          color="warning"
          variant="flat"
          className="mb-3 text-xs space-y-2"
        >
          <p>
            Downloads access is disabled. Post-download renames and undo will be
            paused until access is granted.
          </p>
          <button
            type="button"
            onClick={openOnboarding}
            className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-sm font-normal text-xs cursor-pointer transition-all bg-zinc-900 text-white hover:opacity-80"
          >
            Grant access
          </button>
        </Alert>
      ) : null}

      <Tabs
        aria-label="Navigation tabs"
        variant="underlined"
        onSelectionChange={(key) => {
          if (key === 'history' && !historyLoaded) {
            void loadHistory();
          }
        }}
        classNames={{
          tabList: 'gap-6 w-full relative p-0',
          cursor: 'w-full',
          tab: 'px-0 h-10 rounded-none transition-colors data-[focus-visible=true]:outline data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-offset-2 data-[focus-visible=true]:outline-default-400',
          tabContent:
            'text-default-600 transition-colors group-data-[hover=true]:text-default-800 group-data-[selected=true]:text-foreground group-data-[selected=true]:font-medium',
        }}
      >
        <Tab
          key="strategy"
          title={
            <div className="flex items-center gap-2">
              <span>Strategy</span>
            </div>
          }
        >
          <StrategyTab
            loading={loading}
            saving={saving}
            error={error}
            strategy={strategy}
            options={options}
            onChange={handleStrategyChange}
          />
        </Tab>

        <Tab
          key="history"
          title={
            <div className="flex items-center gap-2">
              <span>History</span>
              {upgradeCount > 0 && (
                <Chip
                  size="sm"
                  variant="flat"
                  color="primary"
                  className="text-[9px] h-4 px-1 min-w-4"
                >
                  {upgradeCount}
                </Chip>
              )}
            </div>
          }
        >
          <HistoryTab
            historyFilter={historyFilter}
            onFilterChange={setHistoryFilter}
            filteredHistory={filteredHistory}
          />
        </Tab>
      </Tabs>
    </div>
  );
}

export default App;
