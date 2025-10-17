import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  getStorageAdapter,
  registerResetHook,
} from '@/entrypoints/shared/settings/storage-state';

const STORAGE_KEY = 'local:ai.models.setup.v1';

export interface AiModelSetupError {
  message: string;
  code?: string;
  occurredAt: number;
}

export interface AiModelSetupState {
  setupCompletedAt: number | null;
  lastError: AiModelSetupError | null;
}

const DEFAULT_STATE: AiModelSetupState = {
  setupCompletedAt: null,
  lastError: null,
};

let cache: AiModelSetupState | null = null;
let loadPromise: Promise<AiModelSetupState> | null = null;
let unwatch: (() => void) | null = null;
const listeners = new Set<(state: AiModelSetupState) => void>();

function sanitiseState(
  value: AiModelSetupState | null | undefined,
): AiModelSetupState {
  if (!value) {
    return { ...DEFAULT_STATE };
  }

  return {
    setupCompletedAt:
      typeof value.setupCompletedAt === 'number'
        ? value.setupCompletedAt
        : null,
    lastError: sanitiseError(value.lastError),
  } satisfies AiModelSetupState;
}

function sanitiseError(
  error: AiModelSetupError | null | undefined,
): AiModelSetupError | null {
  if (!error || typeof error !== 'object') {
    return null;
  }
  const message = typeof error.message === 'string' ? error.message : null;
  if (!message) {
    return null;
  }
  const code =
    typeof error.code === 'string' && error.code.trim().length > 0
      ? error.code
      : undefined;
  const occurredAt =
    typeof error.occurredAt === 'number' && Number.isFinite(error.occurredAt)
      ? error.occurredAt
      : Date.now();
  return {
    message,
    code,
    occurredAt,
  } satisfies AiModelSetupError;
}

async function readState(): Promise<AiModelSetupState> {
  try {
    const stored = await getStorageAdapter().getItem<AiModelSetupState | null>(
      STORAGE_KEY,
    );
    return sanitiseState(stored);
  } catch (error) {
    debugLogger.warn('[AISetupState] Failed to read storage', { error });
    return { ...DEFAULT_STATE };
  }
}

async function writeState(state: AiModelSetupState): Promise<void> {
  cache = state;
  notifyListeners(state);
  try {
    await getStorageAdapter().setItem(STORAGE_KEY, state);
  } catch (error) {
    debugLogger.warn('[AISetupState] Failed to persist storage', { error });
  }
}

function notifyListeners(state: AiModelSetupState): void {
  const snapshot = cloneState(state);
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (error) {
      debugLogger.warn('[AISetupState] Listener failed', { error });
    }
  });
}

function cloneState(state: AiModelSetupState): AiModelSetupState {
  return {
    setupCompletedAt: state.setupCompletedAt,
    lastError: state.lastError ? { ...state.lastError } : null,
  } satisfies AiModelSetupState;
}

function ensureWatch(): void {
  if (unwatch) return;
  try {
    unwatch = getStorageAdapter().watch<AiModelSetupState>(
      STORAGE_KEY,
      (next) => {
        cache = sanitiseState(next);
        notifyListeners(cache);
      },
    );
  } catch (error) {
    debugLogger.warn('[AISetupState] Failed to watch storage', { error });
  }
}

async function ensureState(): Promise<AiModelSetupState> {
  if (cache) {
    ensureWatch();
    return cache;
  }
  if (!loadPromise) {
    loadPromise = readState().then((state) => {
      cache = state;
      loadPromise = null;
      ensureWatch();
      return state;
    });
  }
  return loadPromise;
}

export async function getAiModelSetupState(): Promise<AiModelSetupState> {
  const state = await ensureState();
  return cloneState(state);
}

export async function markAiModelSetupCompleted(
  completedAt: number = Date.now(),
): Promise<AiModelSetupState> {
  await ensureState();
  const next: AiModelSetupState = {
    setupCompletedAt: completedAt,
    lastError: null,
  };
  await writeState(next);
  return cloneState(next);
}

export async function recordAiModelSetupError(params: {
  message: string;
  code?: string;
}): Promise<AiModelSetupState> {
  const current = await ensureState();
  const next: AiModelSetupState = {
    setupCompletedAt: current.setupCompletedAt,
    lastError: {
      message: params.message,
      code: params.code,
      occurredAt: Date.now(),
    },
  };
  await writeState(next);
  return cloneState(next);
}

export async function clearAiModelSetupError(): Promise<AiModelSetupState> {
  const current = await ensureState();
  if (!current.lastError) {
    return cloneState(current);
  }
  const next: AiModelSetupState = {
    setupCompletedAt: current.setupCompletedAt,
    lastError: null,
  };
  await writeState(next);
  return cloneState(next);
}

export async function subscribeAiModelSetupState(
  listener: (state: AiModelSetupState) => void,
): Promise<() => void> {
  listeners.add(listener);
  try {
    listener(cloneState(await ensureState()));
  } catch (error) {
    debugLogger.warn('[AISetupState] Failed to deliver initial state', {
      error,
    });
  }

  return () => {
    listeners.delete(listener);
  };
}

export async function resetAiModelSetupStateForTesting(): Promise<void> {
  await writeState({ ...DEFAULT_STATE });
}

registerResetHook(() => {
  cache = null;
  loadPromise = null;
  listeners.clear();
  unwatch?.();
  unwatch = null;
});
