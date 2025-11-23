import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { type JSX, useEffect, useMemo, useState } from 'react';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  detectFreshOrDevProfile,
  runDiagnostics,
  type SystemDiagnostics,
} from '@/entrypoints/shared/integrations/chrome-ai/diagnostics';
import {
  AI_MODEL_IDS,
  type AiModelId,
  type AiModelProgressEvent,
  ensureAiModelsReady,
  refreshAiModelStatuses,
  subscribeAiModelStatuses,
} from '@/entrypoints/shared/integrations/chrome-ai/model-status';
import {
  type AiModelSetupState,
  clearAiModelSetupError,
  getAiModelSetupState,
  markAiModelSetupCompleted,
  recordAiModelSetupError,
  subscribeAiModelSetupState,
} from '@/entrypoints/shared/integrations/chrome-ai/setup-state';
import {
  InlineAlert,
  LoadingCard,
  PrerequisitesSection,
  WxtDevModeAlert,
} from './components/alerts';
import { ModelStatusCard } from './components/ModelStatusCard';
import { SectionErrorBoundary } from './components/SectionErrorBoundary';
import { SetupChecklistSection } from './components/SetupChecklistSection';
import { TroubleshootingSection } from './components/TroubleshootingSection';
import { VideoTutorialSection } from './components/VideoTutorialSection';
import {
  createInitialProgressMap,
  INITIAL_STATUS_MAP,
  MODEL_ETA,
  MODEL_LABELS,
} from './constants';
import { useLanguageDetectorAutoRetry } from './hooks/useLanguageDetectorAutoRetry';
import type { ModelProgress, StatusSnapshot } from './types';
import {
  describeError,
  detectPreferredLanguage,
  formatRefreshSummary,
  isAbortError,
  isUserActivationIssue,
  resolveSetupErrorMessage,
  resolveSupportedPromptLanguage,
} from './utils';

export function AIModelSetupPage(): JSX.Element {
  const [snapshot, setSnapshot] = useState<StatusSnapshot>({
    statuses: INITIAL_STATUS_MAP,
    lastUpdated: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [storedLastError, setStoredLastError] = useState<string | null>(null);
  const [_setupState, setSetupState] = useState<AiModelSetupState | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [completedAt, setCompletedAt] = useState<number | null>(null);
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
  const [now, setNow] = useState(() => Date.now());
  const [showSuccessPrompt, setShowSuccessPrompt] = useState(false);

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
  }, [snapshot.statuses, storedLastError]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);

    (async () => {
      try {
        const refreshed = await refreshAiModelStatuses();
        if (!active) return;
        setSnapshot({ statuses: refreshed, lastUpdated: Date.now() });
      } catch (error) {
        if (!active) return;
        setLoadError(describeError(error));
      } finally {
        setLoading(false);
      }

      try {
        unsubscribe = await subscribeAiModelStatuses((next) => {
          if (!active) return;
          setSnapshot({ statuses: next, lastUpdated: Date.now() });
        });
      } catch (error) {
        if (!active) return;
        setLoadError((prev) => prev ?? describeError(error));
      }
    })();

    return () => {
      active = false;
      unsubscribe?.();
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const initial = await getAiModelSetupState();
        if (!active) return;
        setSetupState(initial);
        setCompletedAt(initial.setupCompletedAt ?? null);
        setStoredLastError(initial.lastError?.message ?? null);
      } catch (error) {
        if (!active) return;
        debugLogger.warn('[AISetupPage] Failed to load setup state', {
          error,
        });
      }

      try {
        unsubscribe = await subscribeAiModelSetupState((next) => {
          if (!active) return;
          setSetupState(next);
          setCompletedAt(next.setupCompletedAt ?? null);
          setStoredLastError(next.lastError?.message ?? null);
        });
      } catch (error) {
        if (!active) return;
        debugLogger.warn('[AISetupPage] Failed to subscribe setup state', {
          error,
        });
      }
    })();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

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
    setProgress((previous) => {
      const next = { ...previous };
      next[modelId] = { started: false, completed: false };
      return next;
    });
    setStoredLastError(null);
    void clearAiModelSetupError();

    const controller = new AbortController();
    setAbortController(controller);
    setActiveModelId(modelId);
    const preferredLanguage = detectPreferredLanguage();
    const supportedOutputLanguage =
      resolveSupportedPromptLanguage(preferredLanguage);

    // Ask Chrome for a multimodal-capable language model during setup so we
    // fail fast when the "Prompt API for Gemini Nano (Multimodal Input)"
    // flag is left at "Default". Without the image descriptor here Chrome
    // reports the model as ready even though image inputs will be rejected
    // later in the pipeline.
    const languageModelOptions = {
      outputLanguage: supportedOutputLanguage,
      expectedInputs: [
        {
          type: 'text' as const,
          language: preferredLanguage,
          languages: [preferredLanguage],
        },
        { type: 'image' as const },
      ],
      expectedOutputs: [
        {
          type: 'text' as const,
          language: supportedOutputLanguage,
          languages: [supportedOutputLanguage],
        },
      ],
    };

    console.log('[AISetupPage] Calling ensureAiModelsReady with:', {
      modelId,
      preferredLanguage,
      supportedOutputLanguage,
      languageModelOptions,
    });

    try {
      const result = await ensureAiModelsReady({
        ids: [modelId],
        signal: controller.signal,
        onProgress: handleProgressEvent,
        summarizer: {
          type: 'key-points',
          format: 'markdown',
          length: 'short',
          outputLanguage: supportedOutputLanguage,
          expectedInputLanguages: [preferredLanguage],
        },
        languageModel: languageModelOptions,
      });
      const allReadyNow = AI_MODEL_IDS.every((id) => {
        const status = result[id];
        return status?.state === 'available' || status?.state === 'unsupported';
      });
      if (allReadyNow) {
        try {
          const recorded = await markAiModelSetupCompleted();
          setCompletedAt(recorded.setupCompletedAt ?? Date.now());
          setStoredLastError(null);
        } catch (recordError) {
          debugLogger.warn('[AISetupPage] Failed to record setup completion', {
            error: recordError,
          });
          setCompletedAt(Date.now());
        }
      }
      await refreshAfterRun(modelId);
    } catch (error) {
      if (isAbortError(error)) {
        setCancelled(true);
        return;
      }
      const message = describeError(error);
      const code =
        error instanceof Error && error.name ? error.name : undefined;
      setSetupError(message);
      const userActivationIssue = isUserActivationIssue(error, message);
      if (userActivationIssue) {
        setStoredLastError(null);
        await clearAiModelSetupError();
      } else {
        try {
          await recordAiModelSetupError({ message, code });
        } catch (recordError) {
          debugLogger.warn('[AISetupPage] Failed to record setup error', {
            error: recordError,
          });
        }
      }
    } finally {
      setAbortController(null);
      setActiveModelId(null);
    }
  }

  async function refreshAfterRun(modelId: AiModelId): Promise<void> {
    try {
      // Only refresh the model we just downloaded to avoid race conditions
      // with other models while Chrome is still processing
      const refreshed = await refreshAiModelStatuses([modelId]);
      setSnapshot({ statuses: refreshed, lastUpdated: Date.now() });

      // Merge refreshed status with existing snapshot to get complete state
      const currentStatuses = { ...snapshot.statuses, ...refreshed };

      // Reload when Prompt API + Summarizer are ready (ignore language-detector)
      // This ensures we work with fresh state for all models
      const mainModelsReady =
        (currentStatuses['language-model']?.state === 'available' ||
          currentStatuses['language-model']?.state === 'unsupported') &&
        (currentStatuses.summarizer?.state === 'available' ||
          currentStatuses.summarizer?.state === 'unsupported');

      // Auto-reload to get fresh state for all models
      if (mainModelsReady) {
        window.location.reload();
      }
    } catch (error) {
      setLoadError(describeError(error));
    }
  }

  async function handleRefreshStatus(): Promise<void> {
    setLoading(true);
    setLoadError(null);
    try {
      const refreshed = await refreshAiModelStatuses();
      setSnapshot({ statuses: refreshed, lastUpdated: Date.now() });
    } catch (error) {
      setLoadError(describeError(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleRunDiagnostics(): Promise<void> {
    setRunningDiagnostics(true);
    try {
      const results = await runDiagnostics(snapshot.statuses);
      setDiagnostics(results);
    } catch (error) {
      debugLogger.warn('[AISetupPage] Diagnostics failed', { error });
    } finally {
      setRunningDiagnostics(false);
    }
  }

  function handleProgressEvent(event: AiModelProgressEvent): void {
    setProgress((previous) => {
      const next = { ...previous };
      const modelState = { ...next[event.id] };
      switch (event.type) {
        case 'status':
          if (event.status === 'available') {
            modelState.completed = true;
            modelState.started = true;
          }
          break;
        case 'download-start':
          modelState.started = true;
          modelState.error = undefined;
          modelState.errorCode = undefined;
          break;
        case 'download-progress':
          modelState.started = true;
          modelState.loaded = event.loaded;
          modelState.total = event.total;
          break;
        case 'complete':
          modelState.completed = true;
          break;
        case 'error':
          modelState.error = event.error;
          modelState.errorCode = event.errorCode;
          break;
        default:
          break;
      }
      next[event.id] = modelState;
      return next;
    });
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="w-[min(520px,92vw)] rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-default-200"
          >
            <div className="flex items-start gap-4">
              <span className="mt-1 inline-flex rounded-full bg-emerald-50 p-2 text-emerald-600 ring-1 ring-emerald-100">
                <CheckCircleIcon className="h-6 w-6" />
              </span>
              <div className="space-y-3">
                <div>
                  <p className="text-lg font-semibold text-default-900">
                    Congrats! local ai model setup finished
                  </p>
                  <p className="mt-1 text-sm text-default-600">
                    You can close this setup tab now or keep it open to continue
                    debugging.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleCloseSetup}
                    className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
                  >
                    Okay, close setup
                  </button>
                  <button
                    type="button"
                    onClick={handleKeepDebugging}
                    className="inline-flex items-center justify-center rounded-full border border-default-200 px-4 py-2 text-sm font-semibold text-default-700 transition hover:border-default-300 hover:text-default-900 focus:outline-none focus:ring-2 focus:ring-default-200 focus:ring-offset-1"
                  >
                    Keep debugging
                  </button>
                </div>
                <p className="text-xs text-default-400">
                  If the window does not close automatically, you can close the
                  tab manually.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-10">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-default-400">
            NewName Setup
          </p>
          <h1 className="text-2xl font-semibold">
            Enable on-device AI models for smarter file names
          </h1>
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
            {loadError ? (
              <InlineAlert
                tone="danger"
                icon={<ExclamationTriangleIcon className="h-5 w-5" />}
                title="Unable to check model status"
                description={loadError}
              />
            ) : null}

            {(() => {
              const activeError = setupError ?? storedLastError;
              if (!activeError) return null;
              const errorDisplay = resolveSetupErrorMessage(activeError);
              return (
                <InlineAlert
                  tone="danger"
                  icon={<ExclamationTriangleIcon className="h-5 w-5" />}
                  title={errorDisplay.title}
                  description={errorDisplay.description}
                />
              );
            })()}

            {cancelled ? (
              <InlineAlert
                tone="warning"
                icon={<XMarkIcon className="h-5 w-5" />}
                title="Download cancelled"
                description="Pick the model below to try the download again."
              />
            ) : null}

            {completedAt && !setupError && !storedLastError && !cancelled ? (
              <InlineAlert
                tone="success"
                icon={<CheckCircleIcon className="h-5 w-5" />}
                title="Models ready"
                description="Great! You can close this tab or continue tweaking other settings."
              />
            ) : null}

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

            <PrerequisitesSection />
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
      </main>
    </div>
  );
}
