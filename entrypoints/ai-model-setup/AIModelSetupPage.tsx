import {
  ArrowPathIcon,
  BoltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
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
  type AiModelState,
  type AiModelStatus,
  type AiModelStatusMap,
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

type ModelProgress = {
  started: boolean;
  completed: boolean;
  loaded?: number;
  total?: number;
  error?: string;
  errorCode?: string;
};

type StatusSnapshot = {
  statuses: AiModelStatusMap;
  lastUpdated: number;
};

const MODEL_LABELS: Record<AiModelId, string> = {
  'language-model': 'Prompt API (Gemini Nano)',
  summarizer: 'Summarizer API',
  'language-detector': 'Language Detector API',
};

const STATE_DESCRIPTIONS: Record<AiModelState, string> = {
  unknown: 'Not checked yet',
  available: 'Ready to use',
  downloadable: 'Download required',
  downloading: 'Downloading…',
  unavailable: 'Unavailable on this device',
  unsupported: 'Unsupported in this Chrome build',
  error: 'Error checking status',
};

const STATE_TONES: Record<AiModelState, string> = {
  available: 'text-success-600 border-success-200 bg-success-50/80',
  downloadable: 'text-warning-600 border-warning-200 bg-warning-50/80',
  downloading: 'text-primary-600 border-primary-200 bg-primary-50/80',
  unavailable: 'text-danger-600 border-danger-200 bg-danger-50/80',
  unsupported: 'text-default-500 border-default-200 bg-default-50/80',
  error: 'text-danger-600 border-danger-200 bg-danger-50/80',
  unknown: 'text-default-500 border-default-200 bg-default-50/80',
};

const INITIAL_STATUS_MAP: AiModelStatusMap = AI_MODEL_IDS.reduce((acc, id) => {
  acc[id] = {
    id,
    state: 'unknown',
    lastUpdated: 0,
    requiresUserActivation: false,
  };
  return acc;
}, {} as AiModelStatusMap);

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
    if (!completedAt || cancelled || setupError) return;
    const timeout = window.setTimeout(() => {
      try {
        window.close();
      } catch (error) {
        console.warn('Unable to close window after success', error);
      }
    }, 2500);
    return () => window.clearTimeout(timeout);
  }, [completedAt, cancelled, setupError]);

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

    const languageModelOptions = {
      outputLanguage: supportedOutputLanguage,
      expectedInputs: [
        {
          type: 'text' as const,
          language: preferredLanguage,
          languages: [preferredLanguage],
        },
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
      await refreshAfterRun();
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

  async function refreshAfterRun(): Promise<void> {
    try {
      const refreshed = await refreshAiModelStatuses();
      setSnapshot({ statuses: refreshed, lastUpdated: Date.now() });
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

  function handleOpenChromeFlags(): void {
    window.open('chrome://flags/#prompt-api-for-gemini-nano', '_blank');
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-10">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-default-400">
            NewName Setup
          </p>
          <h1 className="text-2xl font-semibold">
            Enable on-device AI models for smarter file names
          </h1>
          <p className="text-sm leading-relaxed text-default-500">
            Chrome downloads Gemini Nano on demand. Click the button below while
            this tab is focused to start the download, monitor progress, and
            unlock Phase 2 renaming.
          </p>
        </header>

        {isWxtDevMode && allUnavailable ? (
          <div className="rounded-xl border-2 border-primary-300 bg-primary-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <SparklesIcon className="mt-0.5 h-6 w-6 flex-shrink-0 text-primary-600" />
              <div className="flex-1 space-y-2">
                <h3 className="text-sm font-semibold text-primary-900">
                  WXT Development Mode Detected
                </h3>
                <p className="text-xs leading-relaxed text-primary-700">
                  You're running in WXT development mode, which uses a separate
                  Chrome profile. Chrome flags and components must be enabled{' '}
                  <strong>in this Chrome window</strong>, not your regular
                  Chrome.
                </p>
                <div className="space-y-1 text-xs text-primary-600">
                  <p className="font-medium">Quick setup:</p>
                  <ol className="list-decimal pl-4 space-y-0.5">
                    <li>Enable flags in THIS Chrome window (links below)</li>
                    <li>Click "Relaunch" and wait for restart</li>
                    <li>Check chrome://components/ for Optimization Guide</li>
                    <li>If missing, wait 1-2 days for component download</li>
                    <li>Return here and click "Run Diagnostics"</li>
                  </ol>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href="chrome://flags/#prompt-api-for-gemini-nano"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-full border border-primary-400 bg-white px-3 py-1 text-xs font-medium text-primary-700 transition hover:bg-primary-100"
                  >
                    Enable Prompt API Flag →
                  </a>
                  <a
                    href="chrome://flags/#optimization-guide-on-device-model"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-full border border-primary-400 bg-white px-3 py-1 text-xs font-medium text-primary-700 transition hover:bg-primary-100"
                  >
                    Enable Optimization Guide Flag →
                  </a>
                  <a
                    href="chrome://components/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-full border border-primary-400 bg-white px-3 py-1 text-xs font-medium text-primary-700 transition hover:bg-primary-100"
                  >
                    Check Components →
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <section className="rounded-2xl border border-default-200 bg-white/70 p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-default-500">
            <SparklesIcon className="h-4 w-4" />
            Requirements
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-default-500">
            <li>Chrome 140+ on Windows, macOS, Linux, or Chromebook Plus.</li>
            <li>At least 16 GB RAM and ~2 GB free storage for Gemini Nano.</li>
            <li>Keep this tab open until the progress indicator completes.</li>
            <li>
              If prompted, stay on this page so Chrome maintains user
              activation.
            </li>
          </ul>
        </section>

        {loading ? (
          <LoadingCard />
        ) : (
          <>
            {allUnavailable && !loading ? (
              <DiagnosticsSection
                diagnostics={diagnostics}
                onRunDiagnostics={handleRunDiagnostics}
                onOpenFlags={handleOpenChromeFlags}
                onRefresh={handleRefreshStatus}
                isRunning={runningDiagnostics}
              />
            ) : null}

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
                Model status
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
          </>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRefreshStatus}
            disabled={loading || Boolean(activeModelId)}
            className="inline-flex items-center justify-center rounded-full border border-default-200 px-4 py-2 text-sm font-medium text-default-600 transition hover:border-default-300 hover:text-default-700 disabled:cursor-not-allowed disabled:border-default-200 disabled:text-default-400"
          >
            <ArrowPathIcon
              className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin text-default-400' : ''}`}
            />
            Re-check models
          </button>

          {activeModelId ? (
            <p className="text-xs font-medium text-default-500">
              Downloading {MODEL_LABELS[activeModelId]}…
            </p>
          ) : null}

          <p className="text-xs text-default-400">
            {formatRefreshSummary(snapshot.lastUpdated, now)}
          </p>
        </div>
      </main>
    </div>
  );
}

function ModelStatusCard({
  status,
  progress,
  lastUpdated,
  now,
  onStart,
  onCancel,
  isActive,
  disabled,
}: {
  status: AiModelStatus;
  progress: ModelProgress;
  lastUpdated: number;
  now: number;
  onStart: () => void;
  onCancel: () => void;
  isActive: boolean;
  disabled: boolean;
}): JSX.Element {
  const tone = STATE_TONES[status.state];
  const stateDescription = STATE_DESCRIPTIONS[status.state];
  const percent = computeProgressPercent(progress.loaded, progress.total);
  const showGauge =
    progress.started &&
    !progress.completed &&
    status.state !== 'available' &&
    status.state !== 'unsupported' &&
    status.state !== 'unavailable';
  const action = resolveModelAction(status.state);
  const showStartButton = Boolean(action) && !isActive;
  const activationTitle = status.requiresUserActivation
    ? 'Chrome needs a user gesture to start downloads. Keep this tab focused.'
    : undefined;
  const actionTone = action?.tone ?? 'secondary';
  const actionClasses =
    actionTone === 'primary'
      ? 'inline-flex items-center justify-center rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-primary-300'
      : 'inline-flex items-center justify-center rounded-full border border-default-200 px-3 py-1.5 text-xs font-medium text-default-600 transition hover:border-default-300 hover:text-default-700 disabled:cursor-not-allowed disabled:border-default-200 disabled:text-default-400';
  const showActions = showStartButton || isActive;
  const staleLabel = resolveStaleBadge(status, lastUpdated, now);

  return (
    <div className={`rounded-xl border bg-white/90 p-4 shadow-sm ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {MODEL_LABELS[status.id]}
          </p>
          <p className="text-xs text-default-500">{stateDescription}</p>
          {status.detail ? (
            <p className="text-xs text-default-500">{status.detail}</p>
          ) : null}
          {status.state === 'error' && progress.error ? (
            <p className="text-xs text-danger-600">
              {progress.error}
              {progress.errorCode ? ` (${progress.errorCode})` : null}
            </p>
          ) : null}
          {status.state === 'unavailable' ? (
            <p className="text-xs text-default-500">
              Check Chrome hardware requirements and try again later.
            </p>
          ) : null}
        </div>
        {staleLabel ? (
          <span className="inline-flex items-center rounded-full bg-default-100 px-2.5 py-1 text-[11px] font-medium text-default-500">
            {staleLabel}
          </span>
        ) : null}
      </div>

      {showGauge ? (
        <ProgressBar percent={percent} />
      ) : status.state === 'available' || progress.completed ? (
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-success-100 px-3 py-1 text-xs font-medium text-success-700">
          <CheckCircleIcon className="h-4 w-4" />
          Ready
        </div>
      ) : null}
      {showActions ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {showStartButton && action ? (
            <button
              type="button"
              onClick={onStart}
              disabled={disabled}
              title={activationTitle}
              className={actionClasses}
            >
              {action.tone === 'primary' ? (
                <BoltIcon className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <ArrowPathIcon className="mr-1.5 h-3.5 w-3.5" />
              )}
              {action.label}
            </button>
          ) : null}
          {isActive ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-full border border-default-200 px-3 py-1.5 text-xs font-medium text-default-600 transition hover:border-default-300 hover:text-default-700"
            >
              <XMarkIcon className="mr-1.5 h-3.5 w-3.5" />
              Cancel download
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ProgressBar({ percent }: { percent: number | null }): JSX.Element {
  return (
    <div className="mt-3">
      <div className="h-2 w-full overflow-hidden rounded-full bg-default-200">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent ?? 15}%` }}
        />
      </div>
      {percent != null ? (
        <p className="mt-1 text-xs text-default-500">{percent}%</p>
      ) : (
        <p className="mt-1 text-xs text-default-500">
          Downloading… keep this tab focused.
        </p>
      )}
    </div>
  );
}

function DiagnosticsSection({
  diagnostics,
  onRunDiagnostics,
  onOpenFlags,
  onRefresh,
  isRunning,
}: {
  diagnostics: SystemDiagnostics | null;
  onRunDiagnostics: () => void;
  onOpenFlags: () => void;
  onRefresh: () => void;
  isRunning: boolean;
}): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border-2 border-warning-300 bg-warning-50 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="mt-0.5 h-6 w-6 flex-shrink-0 text-warning-600" />
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-warning-900">
                Setup Issues Detected
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-warning-700">
                All AI models are unavailable. Click "Run Diagnostics" to
                identify specific problems and get fix instructions.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onRunDiagnostics}
                disabled={isRunning}
                className="inline-flex items-center justify-center rounded-full bg-warning-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-warning-700 disabled:cursor-not-allowed disabled:bg-warning-400"
              >
                {isRunning ? (
                  <ArrowPathIcon className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <SparklesIcon className="mr-1.5 h-3.5 w-3.5" />
                )}
                {isRunning ? 'Running Diagnostics…' : 'Run Diagnostics'}
              </button>
              <button
                type="button"
                onClick={onOpenFlags}
                className="inline-flex items-center justify-center rounded-full border border-warning-300 bg-white px-4 py-2 text-xs font-medium text-warning-700 transition hover:border-warning-400 hover:bg-warning-50"
              >
                <BoltIcon className="mr-1.5 h-3.5 w-3.5" />
                Open Chrome Flags
              </button>
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex items-center justify-center rounded-full border border-warning-300 bg-white px-4 py-2 text-xs font-medium text-warning-700 transition hover:border-warning-400 hover:bg-warning-50"
              >
                <ArrowPathIcon className="mr-1.5 h-3.5 w-3.5" />
                Re-check Status
              </button>
            </div>
          </div>
        </div>
      </div>

      {diagnostics && diagnostics.issues.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-default-600">
            Found {diagnostics.issues.length}{' '}
            {diagnostics.issues.length === 1 ? 'issue' : 'issues'} - Chrome{' '}
            {diagnostics.chromeVersion} on {diagnostics.platform}
          </p>
          {diagnostics.issues.map((issue) => (
            <DiagnosticIssueCard key={issue.issue} issue={issue} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DiagnosticIssueCard({
  issue,
}: {
  issue: import('@/entrypoints/shared/integrations/chrome-ai/diagnostics').DiagnosticResult;
}): JSX.Element {
  const severityStyles = {
    error: 'border-danger-300 bg-danger-50',
    warning: 'border-warning-300 bg-warning-50',
    info: 'border-primary-300 bg-primary-50',
  };

  const severityIcons = {
    error: <XMarkIcon className="h-5 w-5 text-danger-600" />,
    warning: <ExclamationTriangleIcon className="h-5 w-5 text-warning-600" />,
    info: <CheckCircleIcon className="h-5 w-5 text-primary-600" />,
  };

  const textStyles = {
    error: 'text-danger-900',
    warning: 'text-warning-900',
    info: 'text-primary-900',
  };

  const descStyles = {
    error: 'text-danger-700',
    warning: 'text-warning-700',
    info: 'text-primary-700',
  };

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${severityStyles[issue.severity]}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex-shrink-0">
          {severityIcons[issue.severity]}
        </span>
        <div className="flex-1 space-y-2">
          <div>
            <h4
              className={`text-sm font-semibold ${textStyles[issue.severity]}`}
            >
              {issue.title}
            </h4>
            <p
              className={`mt-1 text-xs leading-relaxed ${descStyles[issue.severity]}`}
            >
              {issue.description}
            </p>
          </div>

          <div>
            <p
              className={`text-xs font-semibold ${textStyles[issue.severity]}`}
            >
              How to fix:
            </p>
            <ol className="mt-1 space-y-1">
              {issue.fixSteps.map((step, i) => (
                <li
                  key={step}
                  className={`flex gap-2 text-xs ${descStyles[issue.severity]}`}
                >
                  <span className="font-medium">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {issue.links && issue.links.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {issue.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center text-xs font-medium underline ${textStyles[issue.severity]} hover:no-underline`}
                >
                  {link.label} →
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LoadingCard(): JSX.Element {
  return (
    <div className="rounded-xl border border-default-200 bg-white/70 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <ArrowPathIcon className="h-5 w-5 animate-spin text-default-500" />
        <div>
          <p className="text-sm font-medium text-default-700">
            Checking model availability…
          </p>
          <p className="text-xs text-default-500">
            Hang tight while we inspect the built-in AI APIs.
          </p>
        </div>
      </div>
    </div>
  );
}

function InlineAlert({
  tone,
  icon,
  title,
  description,
}: {
  tone: 'success' | 'warning' | 'danger';
  icon: JSX.Element;
  title: string;
  description: string;
}): JSX.Element {
  const toneStyles: Record<typeof tone, string> = {
    success: 'border-success-200 bg-success-50 text-success-700',
    warning: 'border-warning-200 bg-warning-50 text-warning-700',
    danger: 'border-danger-200 bg-danger-50 text-danger-700',
  };

  return (
    <div
      className={`rounded-xl border p-4 text-sm shadow-sm ${toneStyles[tone]}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5">{icon}</span>
        <div className="space-y-1">
          <p className="font-semibold">{title}</p>
          <p className="text-xs leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

type ModelActionConfig = {
  label: string;
  tone: 'primary' | 'secondary';
};

function resolveModelAction(state: AiModelState): ModelActionConfig | null {
  switch (state) {
    case 'available':
    case 'unsupported':
      return null;
    case 'downloadable':
      return { label: 'Grab this model', tone: 'primary' };
    case 'downloading':
      return { label: 'Resume download', tone: 'primary' };
    case 'error':
      return { label: 'Try again', tone: 'primary' };
    case 'unknown':
      return { label: 'Check status', tone: 'secondary' };
    case 'unavailable':
      return { label: 'Check again', tone: 'secondary' };
    default:
      return null;
  }
}

function resolveSetupErrorMessage(message: string): {
  title: string;
  description: string;
} {
  if (
    message.includes('Requires a user gesture') ||
    message.includes('user gesture it needs')
  ) {
    return {
      title: 'Chrome is waiting for another click',
      description:
        'Give the model’s download button another tap and leave this tab in focus so Chrome keeps the download going.',
    };
  }
  if (
    message.includes('service is not running') ||
    message.includes("hasn't spun up Gemini Nano")
  ) {
    return {
      title: 'Gemini Nano needs a moment to start',
      description:
        'Pop open chrome://on-device-internals, make sure the models show up there, then hop back and retry the download.',
    };
  }
  if (message.includes('Language Detector')) {
    return {
      title: 'Language Detector download is missing',
      description:
        'Start the Language Detector download first—the other models will unlock once that one finishes.',
    };
  }
  if (message.includes('storage') || message.includes('space')) {
    return {
      title: 'Chrome needs a bit more free space',
      description:
        'Free up roughly 10 GB, then come back and hit the download again. Chrome will clear the models automatically if storage gets tight later.',
    };
  }
  return {
    title: 'Model setup ran into a snag',
    description: message,
  };
}

function isUserActivationIssue(error: unknown, message: string): boolean {
  if (message.includes('Requires a user gesture')) return true;
  if (message.includes('user gesture it needs')) return true;
  if (message.includes('user activation')) return true;
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return true;
  }
  if (error instanceof Error && error.name === 'NotAllowedError') {
    return true;
  }
  return false;
}

function formatRefreshSummary(lastUpdated: number, now: number): string {
  if (!lastUpdated) {
    return 'Status check pending…';
  }
  const relative = formatRelativeTime(lastUpdated, now);
  return `Statuses refreshed ${relative}.`;
}

function resolveStaleBadge(
  status: AiModelStatus,
  lastUpdated: number,
  now: number,
): string | null {
  if (status.state === 'downloading') return null;
  const reference = status.lastUpdated || lastUpdated;
  if (!reference) {
    return 'Waiting for first check';
  }
  const ageMs = now - reference;
  if (ageMs <= 0) return null;
  if (ageMs > 3 * 60 * 1000) {
    return `Checked ${formatRelativeTime(reference, now)}`;
  }
  return null;
}

function formatRelativeTime(timestamp: number, now: number): string {
  const diff = timestamp - now;
  const seconds = Math.round(diff / 1000);
  if (Math.abs(seconds) < 45) {
    return 'just now';
  }
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 45) {
    const value = Math.abs(minutes);
    const unit = value === 1 ? 'minute' : 'minutes';
    return minutes < 0 ? `${value} ${unit} ago` : `in ${value} ${unit}`;
  }
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 22) {
    const value = Math.abs(hours);
    const unit = value === 1 ? 'hour' : 'hours';
    return hours < 0 ? `${value} ${unit} ago` : `in ${value} ${unit}`;
  }
  const days = Math.round(hours / 24);
  const value = Math.abs(days);
  const unit = value === 1 ? 'day' : 'days';
  return days < 0 ? `${value} ${unit} ago` : `in ${value} ${unit}`;
}

function computeProgressPercent(
  loaded?: number,
  total?: number,
): number | null {
  if (typeof loaded === 'number' && typeof total === 'number' && total > 0) {
    return Math.min(100, Math.max(0, Math.round((loaded / total) * 100)));
  }
  if (typeof loaded === 'number') {
    if (loaded >= 0 && loaded <= 1) {
      return Math.min(100, Math.max(0, Math.round(loaded * 100)));
    }
    return Math.min(100, Math.max(0, Math.round(loaded)));
  }
  return null;
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function detectPreferredLanguage(): string {
  return navigator.language?.split('-')[0]?.toLowerCase() ?? 'en';
}

const SUPPORTED_PROMPT_OUTPUT_LANGUAGES = new Set(['en', 'es', 'ja']);

function resolveSupportedPromptLanguage(candidate: string): string {
  if (SUPPORTED_PROMPT_OUTPUT_LANGUAGES.has(candidate)) {
    return candidate;
  }
  return 'en';
}

function createInitialProgressMap(): Record<AiModelId, ModelProgress> {
  return AI_MODEL_IDS.reduce(
    (acc, id) => {
      acc[id] = { started: false, completed: false };
      return acc;
    },
    {} as Record<AiModelId, ModelProgress>,
  );
}
