import { browser } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type {
  TextAnalysisMode,
  TextUpgradeModelSource,
} from '@/entrypoints/shared/integrations/text-analysis/types';
import type { AiModelId, AiModelState } from './model-status';

const TELEMETRY_KEY = 'session:telemetry.aiModels';

type StatusTransitionCounters = Record<AiModelState, number>;
type ErrorCounters = Record<string, number>;

export interface AiModelTelemetryState {
  statusTransitions: Record<AiModelId, StatusTransitionCounters>;
  downloadStarts: Record<AiModelId, number>;
  downloadCompletes: Record<AiModelId, number>;
  errors: Record<AiModelId, ErrorCounters>;
  pipelineBlocked: Record<string, number>;
  pipelineRouted: Record<TextUpgradeModelSource, number>;
}

const DEFAULT_STATE: AiModelTelemetryState = {
  statusTransitions: {
    'language-model': createStatusCounter(),
    summarizer: createStatusCounter(),
    'language-detector': createStatusCounter(),
  },
  downloadStarts: {
    'language-model': 0,
    summarizer: 0,
    'language-detector': 0,
  },
  downloadCompletes: {
    'language-model': 0,
    summarizer: 0,
    'language-detector': 0,
  },
  errors: {
    'language-model': {},
    summarizer: {},
    'language-detector': {},
  },
  pipelineBlocked: {},
  pipelineRouted: {
    'on-device': 0,
    cloud: 0,
  },
};

let telemetryState: AiModelTelemetryState | null = null;
let loadPromise: Promise<AiModelTelemetryState> | null = null;
let persistPromise: Promise<void> | null = null;

export function recordAiModelStatusTransition(
  id: AiModelId,
  from: AiModelState,
  to: AiModelState,
): void {
  queueUpdate(({ statusTransitions }) => {
    increment(statusTransitions[id], to);
    debugLogger.log('[AiTelemetry] status-change', { id, from, to });
  });
}

export function recordAiModelDownloadStart(id: AiModelId): void {
  queueUpdate(({ downloadStarts }) => {
    downloadStarts[id] += 1;
    debugLogger.log('[AiTelemetry] download-start', { id });
  });
}

export function recordAiModelDownloadComplete(id: AiModelId): void {
  queueUpdate(({ downloadCompletes }) => {
    downloadCompletes[id] += 1;
    debugLogger.log('[AiTelemetry] download-complete', { id });
  });
}

export function recordAiModelError(id: AiModelId, errorCode?: string): void {
  if (!errorCode) {
    errorCode = 'unknown';
  }
  queueUpdate(({ errors }) => {
    const counters = errors[id];
    counters[errorCode] = (counters[errorCode] ?? 0) + 1;
    debugLogger.warn('[AiTelemetry] model-error', { id, errorCode });
  });
}

export function recordAiPipelineBlocked(
  mode: TextAnalysisMode,
  reason: string,
): void {
  const key = `${mode}:${reason}`;
  queueUpdate(({ pipelineBlocked }) => {
    pipelineBlocked[key] = (pipelineBlocked[key] ?? 0) + 1;
    debugLogger.log('[AiTelemetry] pipeline-blocked', { mode, reason });
  });
}

export function recordAiPipelineRouted(source: TextUpgradeModelSource): void {
  queueUpdate(({ pipelineRouted }) => {
    pipelineRouted[source] = (pipelineRouted[source] ?? 0) + 1;
    debugLogger.log('[AiTelemetry] pipeline-routed', { source });
  });
}

export async function getAiModelTelemetrySnapshot(): Promise<AiModelTelemetryState> {
  const state = await ensureState();
  return cloneTelemetryState(state);
}

export async function resetAiModelTelemetry(): Promise<void> {
  const fresh = cloneDefaultState();
  telemetryState = fresh;
  schedulePersist(fresh);
}

function queueUpdate(mutator: (state: AiModelTelemetryState) => void): void {
  void ensureState()
    .then((state) => {
      mutator(state);
      schedulePersist(state);
    })
    .catch((error) => {
      debugLogger.warn('[AiTelemetry] Failed to update telemetry', {
        error,
      });
    });
}

async function ensureState(): Promise<AiModelTelemetryState> {
  if (telemetryState) {
    return telemetryState;
  }
  if (!loadPromise) {
    loadPromise = loadFromStorage();
  }
  telemetryState = await loadPromise;
  loadPromise = null;
  return telemetryState;
}

async function loadFromStorage(): Promise<AiModelTelemetryState> {
  try {
    const stored = await browser.storage.session.get(TELEMETRY_KEY);
    const snapshot = stored?.[TELEMETRY_KEY] as
      | AiModelTelemetryState
      | undefined;
    if (snapshot) {
      return mergeWithDefaults(snapshot);
    }
  } catch (error) {
    debugLogger.warn('[AiTelemetry] Failed to read telemetry storage', {
      error,
    });
  }
  return cloneDefaultState();
}

function schedulePersist(state: AiModelTelemetryState): void {
  if (persistPromise) {
    return;
  }
  persistPromise = browser.storage.session
    .set({ [TELEMETRY_KEY]: state })
    .catch((error) => {
      debugLogger.warn('[AiTelemetry] Failed to persist telemetry', {
        error,
      });
    })
    .finally(() => {
      persistPromise = null;
    });
}

function createStatusCounter(): StatusTransitionCounters {
  return {
    available: 0,
    downloadable: 0,
    downloading: 0,
    unavailable: 0,
    unsupported: 0,
    error: 0,
    unknown: 0,
  };
}

function increment(
  counters: StatusTransitionCounters,
  state: AiModelState,
): void {
  counters[state] = (counters[state] ?? 0) + 1;
}

function mergeWithDefaults(
  snapshot: AiModelTelemetryState,
): AiModelTelemetryState {
  const merged = cloneDefaultState();
  for (const id of Object.keys(snapshot.statusTransitions) as AiModelId[]) {
    Object.assign(merged.statusTransitions[id], snapshot.statusTransitions[id]);
  }
  for (const id of Object.keys(snapshot.downloadStarts) as AiModelId[]) {
    merged.downloadStarts[id] = snapshot.downloadStarts[id];
  }
  for (const id of Object.keys(snapshot.downloadCompletes) as AiModelId[]) {
    merged.downloadCompletes[id] = snapshot.downloadCompletes[id];
  }
  for (const id of Object.keys(snapshot.errors) as AiModelId[]) {
    merged.errors[id] = { ...merged.errors[id], ...snapshot.errors[id] };
  }
  merged.pipelineBlocked = {
    ...snapshot.pipelineBlocked,
  };
  merged.pipelineRouted = {
    ...merged.pipelineRouted,
    ...snapshot.pipelineRouted,
  };
  return merged;
}

function cloneDefaultState(): AiModelTelemetryState {
  return {
    statusTransitions: {
      'language-model': {
        ...DEFAULT_STATE.statusTransitions['language-model'],
      },
      summarizer: { ...DEFAULT_STATE.statusTransitions.summarizer },
      'language-detector': {
        ...DEFAULT_STATE.statusTransitions['language-detector'],
      },
    },
    downloadStarts: { ...DEFAULT_STATE.downloadStarts },
    downloadCompletes: { ...DEFAULT_STATE.downloadCompletes },
    errors: {
      'language-model': { ...DEFAULT_STATE.errors['language-model'] },
      summarizer: { ...DEFAULT_STATE.errors.summarizer },
      'language-detector': { ...DEFAULT_STATE.errors['language-detector'] },
    },
    pipelineBlocked: { ...DEFAULT_STATE.pipelineBlocked },
    pipelineRouted: { ...DEFAULT_STATE.pipelineRouted },
  };
}

function cloneTelemetryState(
  state: AiModelTelemetryState,
): AiModelTelemetryState {
  return {
    statusTransitions: {
      'language-model': { ...state.statusTransitions['language-model'] },
      summarizer: { ...state.statusTransitions.summarizer },
      'language-detector': { ...state.statusTransitions['language-detector'] },
    },
    downloadStarts: { ...state.downloadStarts },
    downloadCompletes: { ...state.downloadCompletes },
    errors: {
      'language-model': { ...state.errors['language-model'] },
      summarizer: { ...state.errors.summarizer },
      'language-detector': { ...state.errors['language-detector'] },
    },
    pipelineBlocked: { ...state.pipelineBlocked },
    pipelineRouted: { ...state.pipelineRouted },
  };
}
