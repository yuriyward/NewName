/**
 * Test utilities for mocking Chrome AI model status functions.
 * Provides reusable mocks for ensureAiModelsReady with happy path and error scenarios.
 */

import type { vi } from 'vitest';
import type {
  AiModelId,
  AiModelState,
  AiModelStatus,
  AiModelStatusMap,
} from './model-status/status-types';

/**
 * Create a mock AiModelStatus for testing.
 */
function createMockModelStatus(
  id: AiModelId,
  state: AiModelState,
  overrides: Partial<AiModelStatus> = {},
): AiModelStatus {
  return {
    id,
    state,
    lastUpdated: Date.now(),
    requiresUserActivation: false,
    ...overrides,
  };
}

/**
 * Create a mock AiModelStatusMap for testing.
 * Represents the state of all AI models.
 */
export function createMockModelStatusMap(
  overrides: Partial<Record<AiModelId, Partial<AiModelStatus>>> = {},
): AiModelStatusMap {
  const defaults: AiModelStatusMap = {
    'language-detector': createMockModelStatus(
      'language-detector',
      'available',
    ),
    summarizer: createMockModelStatus('summarizer', 'available'),
    'language-model': createMockModelStatus('language-model', 'available'),
  };

  const merged = { ...defaults };
  for (const [id, override] of Object.entries(overrides)) {
    if (id in merged) {
      merged[id as AiModelId] = createMockModelStatus(
        id as AiModelId,
        (override?.state as AiModelState) || 'unknown',
        override,
      );
    }
  }

  return merged;
}

/**
 * Setup happy path mock for ensureAiModelsReady.
 * Models are immediately ready.
 */
export function mockEnsureAiModelsReadySuccess(
  ensureAiModelsReadyMock: ReturnType<typeof vi.fn>,
): void {
  ensureAiModelsReadyMock.mockResolvedValue(createMockModelStatusMap());
}

/**
 * Setup error mock for ensureAiModelsReady.
 * Models are unavailable (API not available).
 */
export function mockEnsureAiModelsReadyUnavailable(
  ensureAiModelsReadyMock: ReturnType<typeof vi.fn>,
): void {
  ensureAiModelsReadyMock.mockResolvedValue(
    createMockModelStatusMap({
      'language-detector': {
        state: 'unavailable',
        detail: 'API not available',
      },
      summarizer: { state: 'unavailable', detail: 'API not available' },
      'language-model': { state: 'unavailable', detail: 'API not available' },
    }),
  );
}

/**
 * Setup error mock for ensureAiModelsReady.
 * Models are downloading but not yet ready.
 */
export function mockEnsureAiModelsReadyDownloading(
  ensureAiModelsReadyMock: ReturnType<typeof vi.fn>,
): void {
  ensureAiModelsReadyMock.mockResolvedValue(
    createMockModelStatusMap({
      'language-detector': {
        state: 'downloading',
        detail: 'Download in progress',
      },
      summarizer: { state: 'downloading', detail: 'Download in progress' },
      'language-model': {
        state: 'downloading',
        detail: 'Download in progress',
      },
    }),
  );
}

/**
 * Setup error mock for ensureAiModelsReady.
 * Throws an error when called (e.g., network error, API error).
 */
export function mockEnsureAiModelsReadyError(
  ensureAiModelsReadyMock: ReturnType<typeof vi.fn>,
  error: Error = new Error('Failed to initialize AI models'),
): void {
  ensureAiModelsReadyMock.mockRejectedValue(error);
}

/**
 * Setup mock for ensureAiModelsReady with NotAllowedError.
 * Occurs when Chrome blocks the request (models not downloaded).
 */
export function mockEnsureAiModelsReadyNotAllowed(
  ensureAiModelsReadyMock: ReturnType<typeof vi.fn>,
): void {
  const error = new DOMException('NotAllowedError', 'NotAllowedError');
  mockEnsureAiModelsReadyError(ensureAiModelsReadyMock, error);
}

/**
 * Setup mock for ensureAiModelsReady with AbortError.
 * Occurs when model download is cancelled.
 */
export function mockEnsureAiModelsReadyAborted(
  ensureAiModelsReadyMock: ReturnType<typeof vi.fn>,
): void {
  const error = new DOMException('Download cancelled', 'AbortError');
  mockEnsureAiModelsReadyError(ensureAiModelsReadyMock, error);
}

/**
 * Setup partial mock for ensureAiModelsReady.
 * Some models ready, others still loading.
 */
export function mockEnsureAiModelsReadyPartial(
  ensureAiModelsReadyMock: ReturnType<typeof vi.fn>,
): void {
  ensureAiModelsReadyMock.mockResolvedValue(
    createMockModelStatusMap({
      'language-detector': { state: 'available' },
      summarizer: { state: 'downloading', detail: 'Download in progress' },
      'language-model': { state: 'unsupported', detail: 'Device incompatible' },
    }),
  );
}
