/**
 * Settings popup for configuring deterministic Instant Baseline strategies
 */

import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { Alert } from '@heroui/alert';
import { Chip } from '@heroui/chip';
import { Tab, Tabs } from '@heroui/tabs';
import type { JSX } from 'react';
import { STRATEGY_OPTIONS } from '@/entrypoints/shared/pipeline/strategy-options';
import { Skeleton } from '@/entrypoints/shared/ui/Skeleton';
import { ThemeToggleButton } from '@/entrypoints/shared/ui/ThemeToggleButton';
import { AiFeatureReminderBanner } from './components/AiFeatureReminderBanner';
import AiModelBanner from './components/AiModelBanner';
import HistoryTab from './components/HistoryTab';
import { IconButton } from './components/IconButton';
import { PrimaryButton } from './components/PrimaryButton';
import { ProcessingModeIndicator } from './components/ProcessingModeIndicator';
import StrategyTab from './components/StrategyTab';
import { usePopupState } from './hooks/usePopupState';
import { DownloadsAccessScreen } from './onboarding/DownloadsAccessScreen';

function App(): JSX.Element {
  const {
    downloadsAccess,
    history,
    aiModel,
    settings,
    reminder,
    computed,
    navigation,
  } = usePopupState();

  const options = STRATEGY_OPTIONS;

  if (!downloadsAccess.downloadsAccessChecked) {
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

  if (downloadsAccess.showOnboarding) {
    return (
      <div className="w-96 p-4 bg-background text-foreground">
        <DownloadsAccessScreen
          onComplete={downloadsAccess.handleOnboardingComplete}
        />
      </div>
    );
  }

  return (
    <div className="w-96 p-3 bg-background text-foreground relative">
      {/* Settings Icon */}
      <IconButton
        onClick={() => void navigation.handleOpenSettings()}
        icon={<Cog6ToothIcon className="size-4" />}
        title="Open settings"
        className="absolute top-2 right-10 z-20"
      />

      {/* Processing Mode Indicator */}
      {settings.processingMode && (
        <div className="absolute top-2 right-18 z-20">
          <ProcessingModeIndicator mode={settings.processingMode} />
        </div>
      )}

      {/* Dark Mode Toggle */}
      <ThemeToggleButton size="sm" className="absolute top-2 right-2 z-20" />

      <header className="mb-3 flex items-center gap-2">
        <h1 className="text-lg font-semibold">NewName</h1>
        {/* Saved Chip - inline with header to avoid overlap with icons */}
        {!settings.saving && settings.savedAt !== null && (
          <Chip
            color="success"
            variant="flat"
            size="sm"
            className="text-xs animate-in fade-in slide-in-from-left-2 duration-300"
          >
            Saved
          </Chip>
        )}
      </header>

      {downloadsAccess.accessCheckError ? (
        <Alert color="warning" variant="flat" className="mb-3 text-xs">
          {downloadsAccess.accessCheckError}
        </Alert>
      ) : null}

      {aiModel.aiStatusError ? (
        <Alert
          color="warning"
          variant="flat"
          className="mb-3 text-xs space-y-1"
        >
          <p>Unable to check AI model status.</p>
          <p>{aiModel.aiStatusError}</p>
        </Alert>
      ) : null}

      {/* AI Feature Reminder Banner - shown to users who declined AI after 3 days */}
      <AiFeatureReminderBanner
        visible={reminder.showReminder && !computed.shouldShowAiBanner}
        onTryAi={reminder.handleTryAi}
        onRemindLater={reminder.handleRemindLater}
      />

      {/* AI Model Setup Banner - shown when local AI models need setup */}
      <AiModelBanner
        visible={computed.shouldShowAiBanner}
        lastError={aiModel.aiLastSetupError}
        onEnableAi={navigation.handleOpenAiSetup}
      />

      {downloadsAccess.needsPersistentSetup ? (
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
          <PrimaryButton
            onClick={() => void downloadsAccess.openPersistentSetup()}
          >
            Complete setup
          </PrimaryButton>
        </Alert>
      ) : null}

      {downloadsAccess.hasDownloadsAccess === false ? (
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
          <PrimaryButton onClick={downloadsAccess.openOnboarding}>
            Grant persistent access
          </PrimaryButton>
        </Alert>
      ) : null}

      {downloadsAccess.hasDownloadsAccess === true &&
      !downloadsAccess.persistentAccessGranted ? (
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
          <PrimaryButton onClick={downloadsAccess.openOnboarding}>
            Enable persistent access
          </PrimaryButton>
        </Alert>
      ) : null}

      <Tabs
        aria-label="Navigation tabs"
        variant="underlined"
        onSelectionChange={(key) => {
          if (key === 'history' && !history.historyLoaded) {
            void history.loadHistory();
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
            loading={settings.loading}
            saving={settings.saving}
            error={settings.error}
            strategy={settings.strategy}
            options={options}
            onChange={settings.handleStrategyChange}
            aiEnabled={computed.aiEnabled}
            onDisabledClick={navigation.handleOpenSettings}
          />
        </Tab>

        <Tab
          key="history"
          title={
            <div className="flex items-center gap-2">
              <span>History</span>
              {history.upgradeCount > 0 && (
                <Chip
                  size="sm"
                  variant="flat"
                  color="primary"
                  className="text-[9px] h-4 px-1 min-w-4"
                >
                  {history.upgradeCount}
                </Chip>
              )}
            </div>
          }
        >
          <HistoryTab
            historyFilter={history.historyFilter}
            onFilterChange={history.setHistoryFilter}
            filteredHistory={history.filteredHistory}
            fileTypeCounts={history.fileTypeCounts}
          />
        </Tab>
      </Tabs>
    </div>
  );
}

export default App;
