import ArrowLeftIcon from '@heroicons/react/24/outline/ArrowLeftIcon';
import CloudIcon from '@heroicons/react/24/outline/CloudIcon';
import { type JSX, useEffect, useMemo, useState } from 'react';
import { browser } from 'wxt/browser';
import {
  detectFreshOrDevProfile,
  type SystemDiagnostics,
} from '@/entrypoints/shared/integrations/chrome-ai/diagnostics';
import {
  AI_MODEL_IDS,
  type AiModelId,
} from '@/entrypoints/shared/integrations/chrome-ai/model-status';
import { clearAiModelSetupError } from '@/entrypoints/shared/integrations/chrome-ai/setup-state';
import { LoadingCard, WxtDevModeAlert } from './components/alerts';
import { ModelStatusCard } from './components/ModelStatusCard';
import { SectionErrorBoundary } from './components/SectionErrorBoundary';
import { SetupChecklistSection } from './components/SetupChecklistSection';
import { StatusAlertsSection } from './components/StatusAlertsSection';
import { SuccessModal } from './components/SuccessModal';
import { TroubleshootingSection } from './components/TroubleshootingSection';
import { VideoTutorialSection } from './components/VideoTutorialSection';
import { createInitialProgressMap, MODEL_ETA, MODEL_LABELS } from './constants';
import {
  createProgressHandler,
  handleRunDiagnostics as runDiagnosticsHelper,
} from './event-handlers';
import { useLanguageDetectorAutoRetry } from './hooks/useLanguageDetectorAutoRetry';
import { useModelStatusSubscription } from './hooks/useModelStatusSubscription';
import { useSetupStateSubscription } from './hooks/useSetupStateSubscription';
import {
  handleSetupError,
  isAbortError,
  recordSetupCompletion,
  startModelSetup,
} from './setup-handlers';
import type { ModelProgress } from './types';
import { describeError, formatRefreshSummary } from './utils';

export function AIModelSetupPage(): JSX.Element {
  const {
    snapshot,
    setSnapshot,
    loading,
    loadError,
    setLoadError,
    now,
    handleRefreshStatus,
  } = useModelStatusSubscription();

  const { completedAt, setCompletedAt, storedLastError, setStoredLastError } =
    useSetupStateSubscription();

  const [setupError, setSetupError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [progress, setProgress] = useState<Record<AiModelId, ModelProgress>>(
    () => createInitialProgressMap(),
  );
  const [activeModelId, setActiveModelId] = useState<AiModelId | null>(null);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(
    null,
  );
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [isWxtDevMode, setIsWxtDevMode] = useState(false);
  const [showSuccessPrompt, setShowSuccessPrompt] = useState(false);

  const handleProgressEvent = createProgressHandler(setProgress);

  // Auto-retry language-detector when Chrome is still initializing it
  const languageDetectorStatus = snapshot.statuses['language-detector'];
  useLanguageDetectorAutoRetry({
    status: languageDetectorStatus,
    isDownloading: activeModelId === 'language-detector',
    onStatusRefresh: setSnapshot,
  });

  useEffect(() => {
    const profileInfo = detectFreshOrDevProfile();
    setIsWxtDevMode(profileInfo.isLikelyWxt);
  }, []);

  useEffect(() => {
    if (!storedLastError) return;
    const hasErrorStatus = AI_MODEL_IDS.some(
      (id) => snapshot.statuses[id].state === 'error',
    );
    if (!hasErrorStatus) {
      setStoredLastError(null);
      void clearAiModelSetupError();
    }
  }, [snapshot.statuses, storedLastError, setStoredLastError]);

  useEffect(() => {
    if (!completedAt || cancelled || setupError || storedLastError) return;
    setShowSuccessPrompt(true);
  }, [completedAt, cancelled, setupError, storedLastError]);

  const allUnavailable = useMemo(() => {
    return AI_MODEL_IDS.every((id) => {
      const status = snapshot.statuses[id];
      return status.state === 'unavailable' || status.state === 'error';
    });
  }, [snapshot.statuses]);

  async function handleStartSetup(modelId: AiModelId): Promise<void> {
    if (activeModelId) return;

    setSetupError(null);
    setCancelled(false);
    setShowSuccessPrompt(false);
    setCompletedAt(null);
    // Always reset progress to 0% when retrying
    // Chrome AI doesn't support resuming - it always restarts from beginning
    setProgress((previous) => ({
      ...previous,
      [modelId]: { started: false, completed: false },
    }));
    setStoredLastError(null);
    void clearAiModelSetupError();

    // Clear any stale in-flight download cache to ensure fresh progress monitoring
    // This fixes the stuck-download bug after page refresh where old promises
    // were reused without attaching new progress monitors
    // Clear ALL cache entries for this model ID, regardless of options configuration
    const { clearInFlightPreparation } = await import(
      '@/entrypoints/shared/integrations/chrome-ai/model-status/status-preparation'
    );
    clearInFlightPreparation([modelId]);

    const controller = new AbortController();
    setAbortController(controller);
    setActiveModelId(modelId);

    try {
      const { allReady } = await startModelSetup({
        modelId,
        signal: controller.signal,
        onProgress: handleProgressEvent,
      });

      if (allReady) {
        const completedTime = await recordSetupCompletion();
        setCompletedAt(completedTime);
        setStoredLastError(null);
      }
      await refreshAfterRun(modelId);
    } catch (error) {
      if (isAbortError(error)) {
        setCancelled(true);
        return;
      }
      const { message } = await handleSetupError(error);
      setSetupError(message);
    } finally {
      setAbortController(null);
      setActiveModelId(null);
    }
  }

  async function refreshAfterRun(modelId: AiModelId): Promise<void> {
    try {
      const { refreshAiModelStatuses } = await import(
        '@/entrypoints/shared/integrations/chrome-ai/model-status'
      );
      const refreshed = await refreshAiModelStatuses([modelId]);
      setSnapshot({ statuses: refreshed, lastUpdated: Date.now() });

      const currentStatuses = { ...snapshot.statuses, ...refreshed };
      const mainModelsReady =
        (currentStatuses['language-model']?.state === 'available' ||
          currentStatuses['language-model']?.state === 'unsupported') &&
        (currentStatuses.summarizer?.state === 'available' ||
          currentStatuses.summarizer?.state === 'unsupported');

      if (mainModelsReady) {
        window.location.reload();
      }
    } catch (error) {
      setLoadError(describeError(error));
    }
  }

  async function handleRunDiagnostics(): Promise<void> {
    return runDiagnosticsHelper(
      snapshot.statuses,
      setDiagnostics,
      setRunningDiagnostics,
    );
  }

  function handleCancel(): void {
    if (!abortController) return;
    abortController.abort();
  }

  function handleCloseSetup(): void {
    try {
      window.close();
    } catch (error) {
      console.warn('Unable to close window after success', error);
    }
  }

  function handleKeepDebugging(): void {
    setShowSuccessPrompt(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {showSuccessPrompt ? (
        <SuccessModal
          onClose={handleCloseSetup}
          onKeepDebugging={handleKeepDebugging}
        />
      ) : null}

      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 pb-32 pt-10">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-default-400">
            NewName Setup · Step 3 of 3
          </p>
          <h1 className="text-2xl font-semibold">Download Local AI Models</h1>
        </header>

        <VideoTutorialSection />

        <SectionErrorBoundary>
          <SetupChecklistSection
            statuses={snapshot.statuses}
            loading={loading}
          />
        </SectionErrorBoundary>

        {isWxtDevMode && allUnavailable ? <WxtDevModeAlert /> : null}

        {loading ? (
          <LoadingCard />
        ) : (
          <>
            <StatusAlertsSection
              loadError={loadError}
              setupError={setupError}
              storedLastError={storedLastError}
              cancelled={cancelled}
              completedAt={completedAt}
            />

            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-default-500">
                Download AI Models
              </h2>
              <div className="space-y-3">
                {AI_MODEL_IDS.map((id) => (
                  <ModelStatusCard
                    key={id}
                    status={snapshot.statuses[id]}
                    progress={progress[id]}
                    lastUpdated={snapshot.lastUpdated}
                    now={now}
                    onStart={() => handleStartSetup(id)}
                    onCancel={handleCancel}
                    isActive={activeModelId === id}
                    disabled={Boolean(activeModelId && activeModelId !== id)}
                  />
                ))}
              </div>
            </section>

            <TroubleshootingSection
              diagnostics={diagnostics}
              onRunDiagnostics={handleRunDiagnostics}
              onRefresh={handleRefreshStatus}
              isRunningDiagnostics={runningDiagnostics}
              loading={loading}
              activeModelId={activeModelId}
              allUnavailable={allUnavailable}
            />
          </>
        )}

        {activeModelId ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-medium text-default-500">
              Downloading {MODEL_LABELS[activeModelId]}… (
              {MODEL_ETA[activeModelId]})
            </p>
            <p className="text-xs text-default-400">
              {formatRefreshSummary(snapshot.lastUpdated, now)}
            </p>
          </div>
        ) : null}

        {/* Cloud AI alternative - at bottom of page */}
        <div className="mt-auto pt-6 border-t border-default-200">
          <p className="flex items-center justify-center gap-2 text-sm text-default-600">
            <CloudIcon className="h-4 w-4 text-default-400" />
            Prefer cloud processing?{' '}
            <button
              type="button"
              onClick={() => {
                const url = browser.runtime.getURL('/ai-mode-selection.html');
                void browser.tabs.create({ url }).then(() => {
                  window.close();
                });
              }}
              className="inline-flex items-center gap-1 font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Switch to Cloud AI
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
