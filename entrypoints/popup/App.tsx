/**
 * Settings popup for configuring deterministic Instant Baseline strategies
 */

import { SunIcon } from '@heroicons/react/16/solid';
import { Cog6ToothIcon, MoonIcon } from '@heroicons/react/24/outline';
import { Alert } from '@heroui/alert';
import { Chip } from '@heroui/chip';
import { Skeleton } from '@heroui/skeleton';
import { Tab, Tabs } from '@heroui/tabs';
import { useTheme } from '@heroui/use-theme';
import type { JSX } from 'react';
import { useCallback, useEffect } from 'react';
import { browser, type PublicPath } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { STRATEGY_OPTIONS } from '@/entrypoints/shared/pipeline/strategy-options';
import { getAppropriateTheme } from '@/entrypoints/shared/ui/theme-service';
import AiModelBanner from './components/AiModelBanner';
import HistoryTab from './components/HistoryTab';
import { IconButton } from './components/IconButton';
import { PrimaryButton } from './components/PrimaryButton';
import { ProcessingModeIndicator } from './components/ProcessingModeIndicator';
import StrategyTab from './components/StrategyTab';
import { useAiModelStatus } from './hooks/useAiModelStatus';
import { useDownloadsAccess } from './hooks/useDownloadsAccess';
import { useHistory } from './hooks/useHistory';
import { usePopupSettings } from './hooks/usePopupSettings';
import { DownloadsAccessScreen } from './onboarding/DownloadsAccessScreen';

function App(): JSX.Element {
  const { theme, setTheme } = useTheme();
  const {
    downloadsAccessChecked,
    hasDownloadsAccess,
    showOnboarding,
    accessCheckError,
    persistentAccessGranted,
    needsPersistentSetup,
    openOnboarding,
    openPersistentSetup,
    handleOnboardingComplete,
  } = useDownloadsAccess();
  const {
    historyLoaded,
    historyFilter,
    setHistoryFilter,
    filteredHistory,
    loadHistory,
    upgradeCount,
    fileTypeCounts,
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
    processingMode,
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

  // AI is enabled if setup is complete OR user is using cloud-only mode
  const aiEnabled =
    !!aiSetupCompletedAt || processingMode === 'cloud' || !aiStatusChecked;

  const shouldShowAiBanner =
    aiStatusChecked &&
    !!aiStatuses &&
    aiBlockingModels.length > 0 &&
    !aiSetupCompletedAt &&
    // Only show if user needs local models (auto or local mode, not cloud-only)
    processingMode !== 'cloud';

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
      <div className="w-96 p-4 bg-background text-foreground">
        <DownloadsAccessScreen onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  return (
    <div className="w-96 p-3 bg-background text-foreground relative">
      {/* Settings Icon */}
      <IconButton
        onClick={() => void handleOpenSettings()}
        icon={<Cog6ToothIcon className="size-4" />}
        title="Open settings"
        className="absolute top-2 right-10 z-20"
      />

      {/* Processing Mode Indicator */}
      {processingMode && (
        <div className="absolute top-2 right-18 z-20">
          <ProcessingModeIndicator mode={processingMode} />
        </div>
      )}

      {/* Dark Mode Toggle */}
      <IconButton
        onClick={() => {
          const newTheme = theme === 'dark' ? 'light' : 'dark';
          void updateThemePreference(newTheme);
        }}
        icon={
          theme === 'dark' ? (
            <SunIcon className="size-4" />
          ) : (
            <MoonIcon className="size-4" />
          )
        }
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        className="absolute top-2 right-2 z-20"
      />

      {/* Floating Saved Chip */}
      {!saving && savedAt !== null && (
        <Chip
          color="success"
          variant="flat"
          size="sm"
          className="absolute top-2 right-18 z-10 text-xs animate-in fade-in slide-in-from-top-2 duration-300"
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
        lastError={aiLastSetupError}
        onEnableAi={handleOpenAiSetup}
      />

      {needsPersistentSetup ? (
        <Alert
          color="primary"
          variant="flat"
          className="mb-3 text-xs space-y-2"
        >
          <p className="font-medium">📋 Complete persistent access setup</p>
          <p>
            Close all browser tabs and reopen to grant permanent folder access.
            Or click below to continue setup now.
          </p>
          <PrimaryButton onClick={() => void openPersistentSetup()}>
            Complete setup
          </PrimaryButton>
        </Alert>
      ) : null}

      {hasDownloadsAccess === false ? (
        <Alert
          color="warning"
          variant="flat"
          className="mb-3 text-xs space-y-2"
        >
          <p className="font-medium">
            Session expired - Grant persistent access
          </p>
          <p>
            Your temporary folder access has expired. Click below to grant
            persistent &quot;Allow on every visit&quot; permission so this
            doesn&apos;t happen again.
          </p>
          <PrimaryButton onClick={openOnboarding}>
            Grant persistent access
          </PrimaryButton>
        </Alert>
      ) : null}

      {hasDownloadsAccess === true && !persistentAccessGranted ? (
        <Alert
          color="default"
          variant="flat"
          className="mb-3 text-xs space-y-2"
        >
          <p className="font-medium">⚡ Upgrade to persistent access</p>
          <p>
            Currently using temporary access. Grant persistent access to skip
            setup on future visits.
          </p>
          <PrimaryButton onClick={openOnboarding}>
            Enable persistent access
          </PrimaryButton>
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
            aiEnabled={aiEnabled}
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
            fileTypeCounts={fileTypeCounts}
          />
        </Tab>
      </Tabs>
    </div>
  );
}

export default App;
