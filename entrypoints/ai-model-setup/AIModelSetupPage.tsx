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
  const [isRunning, setIsRunning] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(
    null,
  );
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [isWxtDevMode, setIsWxtDevMode] = useState(false);

  useEffect(() => {
    const profileInfo = detectFreshOrDevProfile();
    setIsWxtDevMode(profileInfo.isLikelyWxt);
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;

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

  const allReady = useMemo(() => {
    return AI_MODEL_IDS.every((id) => {
      const status = snapshot.statuses[id];
      return status.state === 'available' || status.state === 'unsupported';
    });
  }, [snapshot.statuses]);

  const allUnavailable = useMemo(() => {
    return AI_MODEL_IDS.every((id) => {
      const status = snapshot.statuses[id];
      return status.state === 'unavailable' || status.state === 'error';
    });
  }, [snapshot.statuses]);

  async function handleStartSetup(): Promise<void> {
    if (isRunning) return;

    setSetupError(null);
    setCancelled(false);
    setCompletedAt(null);
    setProgress(createInitialProgressMap());
    setStoredLastError(null);
    void clearAiModelSetupError();

    const controller = new AbortController();
    setAbortController(controller);
    setIsRunning(true);
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
      preferredLanguage,
      supportedOutputLanguage,
      languageModelOptions,
    });

    try {
      await ensureAiModelsReady({
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
      try {
        await recordAiModelSetupError({ message, code });
      } catch (recordError) {
        debugLogger.warn('[AISetupPage] Failed to record setup error', {
          error: recordError,
        });
      }
    } finally {
      setAbortController(null);
      setIsRunning(false);
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

  const primaryButtonLabel = allReady
    ? 'Re-check models'
    : isRunning
      ? 'Setting up…'
      : 'Enable AI renaming';

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
              return (
                <InlineAlert
                  tone="danger"
                  icon={<ExclamationTriangleIcon className="h-5 w-5" />}
                  title="Model setup failed"
                  description={activeError}
                />
              );
            })()}

            {cancelled ? (
              <InlineAlert
                tone="warning"
                icon={<XMarkIcon className="h-5 w-5" />}
                title="Setup cancelled"
                description="Click “Enable AI renaming” again to resume the download."
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
                  />
                ))}
              </div>
            </section>
          </>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleStartSetup}
            disabled={isRunning}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-primary-300"
          >
            {isRunning ? (
              <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BoltIcon className="mr-2 h-4 w-4" />
            )}
            {primaryButtonLabel}
          </button>

          {isRunning ? (
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center justify-center rounded-full border border-default-200 px-4 py-2 text-sm font-medium text-default-600 transition hover:border-default-300 hover:text-default-700"
            >
              Cancel
            </button>
          ) : null}

          <p className="text-xs text-default-400">
            Last checked:{' '}
            {snapshot.lastUpdated
              ? new Date(snapshot.lastUpdated).toLocaleTimeString()
              : 'not yet'}
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
}: {
  status: AiModelStatus;
  progress: ModelProgress;
  lastUpdated: number;
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

  return (
    <div className={`rounded-xl border bg-white/90 p-4 shadow-sm ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {MODEL_LABELS[status.id]}
          </p>
          <p className="text-xs text-default-500">{stateDescription}</p>
          {status.requiresUserActivation ? (
            <p className="text-xs text-warning-600">
              Requires a recent click. Stay on this page while setup runs.
            </p>
          ) : null}
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
        <span className="text-xs text-default-400">
          Updated{' '}
          {status.lastUpdated
            ? new Date(status.lastUpdated).toLocaleTimeString()
            : lastUpdated
              ? new Date(lastUpdated).toLocaleTimeString()
              : 'just now'}
        </span>
      </div>

      {showGauge ? (
        <ProgressBar percent={percent} />
      ) : status.state === 'available' || progress.completed ? (
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-success-100 px-3 py-1 text-xs font-medium text-success-700">
          <CheckCircleIcon className="h-4 w-4" />
          Ready
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
