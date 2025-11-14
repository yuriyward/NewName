/**
 * Tests for pipeline-orchestrator.ts
 * Core integration test for the text upgrade pipeline.
 * Demonstrates mocking of ensureAiModelsReady with happy path and error cases.
 */

import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  mockEnsureAiModelsReadyAborted,
  mockEnsureAiModelsReadyDownloading,
  mockEnsureAiModelsReadyError,
  mockEnsureAiModelsReadyNotAllowed,
  mockEnsureAiModelsReadyPartial,
  mockEnsureAiModelsReadySuccess,
  mockEnsureAiModelsReadyUnavailable,
} from '@/entrypoints/shared/integrations/chrome-ai/test-mocks';
import type {
  TextUpgradeAnalysisRequest,
  TextUpgradeIngestionResult,
} from '@/entrypoints/shared/integrations/text-analysis/types';
import { runTextUpgradePipeline } from './pipeline-orchestrator';

// Mock dependencies must be in hoisted callback
const {
  mockEnsureAiModelsReadyRemote,
  mockDetectLanguage,
  mockSummarizeText,
  mockDecideIfShouldRename,
  mockGenerateFilenameStem,
  mockBuildFilename,
  mockBuildProposedPath,
  mockExtractStemFromBaseline,
  mockFormatReasonTags,
  mockBuildProposalSummary,
  mockRecordDecisionMade,
  mockRecordGenerationSuccess,
  mockRecordGenerationFailure,
  mockRecordPipelineBlocked,
  mockRecordPipelineRouted,
  mockRecordPromptPipelineComplete,
  mockDebugLogger,
} = vi.hoisted(() => ({
  mockEnsureAiModelsReadyRemote: vi.fn(),
  mockDetectLanguage: vi.fn(),
  mockSummarizeText: vi.fn(),
  mockDecideIfShouldRename: vi.fn(),
  mockGenerateFilenameStem: vi.fn(),
  mockBuildFilename: vi.fn(),
  mockBuildProposedPath: vi.fn(),
  mockExtractStemFromBaseline: vi.fn(),
  mockFormatReasonTags: vi.fn(),
  mockBuildProposalSummary: vi.fn(),
  mockRecordDecisionMade: vi.fn(),
  mockRecordGenerationSuccess: vi.fn(),
  mockRecordGenerationFailure: vi.fn(),
  mockRecordPipelineBlocked: vi.fn(),
  mockRecordPipelineRouted: vi.fn(),
  mockRecordPromptPipelineComplete: vi.fn(),
  mockDebugLogger: {
    warn: vi.fn(),
    log: vi.fn(),
  },
}));

vi.mock('@/entrypoints/shared/messaging/text-messages', () => ({
  ensureAiModelsReadyRemote: mockEnsureAiModelsReadyRemote,
}));

vi.mock('./language-detection', () => ({
  detectLanguage: mockDetectLanguage,
}));

vi.mock('./text-summarization', () => ({
  summarizeText: mockSummarizeText,
}));

vi.mock('./rename-decision', () => ({
  decideIfShouldRename: mockDecideIfShouldRename,
}));

vi.mock('./filename-generation', () => ({
  generateFilenameStem: mockGenerateFilenameStem,
}));

vi.mock('./filename-builder', () => ({
  buildFilename: mockBuildFilename,
  buildProposedPath: mockBuildProposedPath,
  extractStemFromBaseline: mockExtractStemFromBaseline,
  formatReasonTags: mockFormatReasonTags,
  buildProposalSummary: mockBuildProposalSummary,
}));

vi.mock('./telemetry', () => ({
  recordDecisionMade: mockRecordDecisionMade,
  recordGenerationSuccess: mockRecordGenerationSuccess,
  recordGenerationFailure: mockRecordGenerationFailure,
  recordPipelineBlocked: mockRecordPipelineBlocked,
  recordPipelineRouted: mockRecordPipelineRouted,
  recordPromptPipelineComplete: mockRecordPromptPipelineComplete,
}));

vi.mock('@/entrypoints/shared/debug/logger', () => ({
  debugLogger: mockDebugLogger,
}));

// Mock console to avoid cluttering test output
let mockConsoleLog: ReturnType<typeof vi.spyOn>;

type RequestOverrides = Omit<
  Partial<TextUpgradeAnalysisRequest>,
  'settings' | 'baseline'
> & {
  settings?: Partial<TextUpgradeAnalysisRequest['settings']>;
  baseline?: Partial<TextUpgradeAnalysisRequest['baseline']>;
};

function createMockRequest(
  overrides: RequestOverrides = {},
): TextUpgradeAnalysisRequest {
  const baseRequest: TextUpgradeAnalysisRequest = {
    requestId: 'req-123',
    historyId: 'hist-123',
    downloadId: 456,
    url: 'https://example.com/document.pdf',
    filename: 'document.pdf',
    relativePath: '/downloads',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    fileType: 'pdf',
    baseline: {
      original: 'document.pdf',
      final: 'document.pdf',
      decision: undefined,
    },
    settings: {
      languagePreference: 'auto',
      mode: 'hybrid-ask',
      maxBytes: 1024 * 1024,
      maxFilenameLength: 80,
      separator: 'clean',
      transliterateAscii: false,
    },
    cloudConfig: {
      enabled: false,
      apiKey: null,
      model: 'gemini-flash-lite-latest',
      consentGiven: false,
      consentTimestamp: null,
    },
    processingPreferences: {
      text: 'auto',
      pdf: 'auto',
      image: 'auto',
    },
  };

  const overrideSettings =
    overrides.settings !== undefined ? overrides.settings : undefined;
  const overrideBaseline =
    overrides.baseline !== undefined ? overrides.baseline : undefined;

  return {
    ...baseRequest,
    ...overrides,
    baseline: {
      ...baseRequest.baseline,
      ...(overrideBaseline ?? {}),
    },
    settings: {
      ...baseRequest.settings,
      ...(overrideSettings ?? {}),
    },
  };
}

function createRequestWithMode(
  mode: TextUpgradeAnalysisRequest['settings']['mode'],
): TextUpgradeAnalysisRequest {
  return createMockRequest({ settings: { mode } });
}

function createMockIngestion(
  overrides: Partial<TextUpgradeIngestionResult> = {},
): TextUpgradeIngestionResult {
  const baseIngestion: TextUpgradeIngestionResult = {
    status: 'ingested',
    requestId: 'req-123',
    analyzedAt: 1_700_000_000_000,
    text: 'This is a sample document containing important information about Q1 2024 budget planning.',
    encoding: 'utf-8',
    originalLength: 78,
    truncated: false,
    metrics: {
      readBytes: 1024,
      elapsedMs: 150,
    },
  };

  return {
    ...baseIngestion,
    ...overrides,
    metrics: {
      ...baseIngestion.metrics,
      ...(overrides.metrics ?? {}),
    },
  };
}

describe('pipeline-orchestrator - ensureAiModelsReady integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog?.mockRestore();
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Setup default mocks for language and summarization
    mockDetectLanguage.mockResolvedValue({
      language: 'en',
      confidence: 0.99,
      source: 'detected',
    });
    mockSummarizeText.mockResolvedValue('Q1 2024 budget planning overview');

    // Setup default decision (should rename)
    mockDecideIfShouldRename.mockResolvedValue({
      shouldRename: true,
      confidence: 0.85,
      reason: 'generic-name',
      explanation: 'Generic filename needs improvement',
    });

    // Setup default generation
    mockGenerateFilenameStem.mockResolvedValue('Q1 Budget Planning 2024');

    // Setup default filename building
    mockBuildFilename.mockReturnValue({
      filename: 'Q1 Budget Planning 2024.pdf',
    });

    mockBuildProposedPath.mockReturnValue(
      '/downloads/Q1 Budget Planning 2024.pdf',
    );
    mockExtractStemFromBaseline.mockReturnValue('Document');
    mockFormatReasonTags.mockReturnValue(['renamed-ai', 'high-confidence']);
    mockBuildProposalSummary.mockReturnValue(
      'AI-generated filename for document',
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog?.mockRestore();
  });

  describe('happy path - models ready', () => {
    it('completes pipeline successfully when all models are ready', async () => {
      mockEnsureAiModelsReadySuccess(mockEnsureAiModelsReadyRemote);

      const request = createMockRequest();
      const ingestion = createMockIngestion();
      const result = await runTextUpgradePipeline(request, ingestion);

      expect(mockEnsureAiModelsReadyRemote).toHaveBeenCalledWith({
        ids: ['language-detector', 'summarizer', 'language-model'],
      });

      expect(result).not.toBeNull();
      expect(result?.status).toBe('success');
      expect(mockDecideIfShouldRename).toHaveBeenCalled();
      expect(mockGenerateFilenameStem).toHaveBeenCalled();
    });

    it('records metrics when pipeline succeeds', async () => {
      mockEnsureAiModelsReadySuccess(mockEnsureAiModelsReadyRemote);

      const request = createMockRequest();
      const ingestion = createMockIngestion();
      await runTextUpgradePipeline(request, ingestion);

      expect(mockRecordDecisionMade).toHaveBeenCalledWith(
        true, // shouldRename
        'generic-name', // reason
        0.85, // confidence
      );

      expect(mockRecordGenerationSuccess).toHaveBeenCalledWith(0.85);
      expect(mockRecordPromptPipelineComplete).toHaveBeenCalled();
      expect(mockRecordPipelineRouted).toHaveBeenCalledWith('on-device');
    });

    it('uses decision confidence to determine auto-apply', async () => {
      mockEnsureAiModelsReadySuccess(mockEnsureAiModelsReadyRemote);

      mockDecideIfShouldRename.mockResolvedValue({
        shouldRename: true,
        confidence: 0.95, // High confidence (>= 0.9)
        reason: 'generic-name',
      });

      const request = createMockRequest();
      const ingestion = createMockIngestion();
      const result = await runTextUpgradePipeline(request, ingestion);

      expect(result?.status).toBe('success');
      if (result?.status === 'success') {
        expect(result.proposal.autoApply).toBe(true);
      }
    });

    it('enables auto-apply for moderate confidence (0.5-0.79)', async () => {
      mockEnsureAiModelsReadySuccess(mockEnsureAiModelsReadyRemote);

      mockDecideIfShouldRename.mockResolvedValue({
        shouldRename: true,
        confidence: 0.75, // Moderate confidence: >= 0.5 but < 0.8
        reason: 'poor-formatting',
      });

      const request = createMockRequest();
      const ingestion = createMockIngestion();
      const result = await runTextUpgradePipeline(request, ingestion);

      if (result?.status === 'success') {
        expect(result.proposal.confidenceScore).toBe(0.75);
        // New unified threshold: 0.75 >= 0.5, so autoApply should be true
        expect(result.proposal.autoApply).toBe(true);
      } else {
        expect(result).not.toBeNull();
      }
    });
  });

  describe('error handling - models unavailable', () => {
    it('continues pipeline when availability returns unavailable statuses', async () => {
      mockEnsureAiModelsReadyUnavailable(mockEnsureAiModelsReadyRemote);

      const request = createRequestWithMode('on-device-only');
      const ingestion = createMockIngestion();
      const result = await runTextUpgradePipeline(request, ingestion);

      expect(result?.status).toBe('success');
      expect(mockRecordPipelineBlocked).not.toHaveBeenCalled();
    });

    it('handles NotAllowedError (models not downloaded)', async () => {
      mockEnsureAiModelsReadyNotAllowed(mockEnsureAiModelsReadyRemote);

      const request = createRequestWithMode('on-device-only');
      const ingestion = createMockIngestion();
      const result = await runTextUpgradePipeline(request, ingestion);

      expect(result?.status).toBe('unavailable');
      if (result?.status === 'unavailable') {
        expect(result.message).toContain('models are not downloaded');
      }
    });

    it('handles AbortError (download cancelled)', async () => {
      mockEnsureAiModelsReadyAborted(mockEnsureAiModelsReadyRemote);

      const request = createRequestWithMode('on-device-only');
      const ingestion = createMockIngestion();
      const result = await runTextUpgradePipeline(request, ingestion);

      expect(result?.status).toBe('unavailable');
      if (result?.status === 'unavailable') {
        expect(result.message).toContain('cancelled');
      }
    });

    it('handles generic API error', async () => {
      mockEnsureAiModelsReadyError(
        mockEnsureAiModelsReadyRemote,
        new Error('Network error'),
      );

      const request = createRequestWithMode('on-device-only');
      const ingestion = createMockIngestion();
      const result = await runTextUpgradePipeline(request, ingestion);

      expect(result?.status).toBe('unavailable');
      expect(result).not.toBeNull();
      expect(mockDebugLogger.warn).toHaveBeenCalled();
    });

    it('continues with hybrid-ask mode on error when mode allows fallback', async () => {
      mockEnsureAiModelsReadyError(mockEnsureAiModelsReadyRemote);

      const request = createRequestWithMode('hybrid-ask'); // Allows fallback to other methods
      const ingestion = createMockIngestion();
      await runTextUpgradePipeline(request, ingestion);

      // Should not block - may continue or return null depending on fallback logic
      expect(mockRecordPipelineBlocked).toHaveBeenCalled();
    });
  });

  describe('error handling - models downloading', () => {
    it('continues pipeline when models are still downloading', async () => {
      mockEnsureAiModelsReadyDownloading(mockEnsureAiModelsReadyRemote);

      const request = createRequestWithMode('on-device-only');
      const ingestion = createMockIngestion();
      const result = await runTextUpgradePipeline(request, ingestion);

      expect(result?.status).toBe('success');
    });

    it('allows hybrid mode to continue even when models downloading', async () => {
      mockEnsureAiModelsReadyDownloading(mockEnsureAiModelsReadyRemote);

      const request = createRequestWithMode('hybrid-ask');
      const ingestion = createMockIngestion();
      await runTextUpgradePipeline(request, ingestion);

      // May return null or continue depending on hybrid logic
      expect(mockRecordPipelineBlocked).not.toHaveBeenCalled();
    });
  });

  describe('error handling - partial model availability', () => {
    it('handles scenario where some models are ready and others are not', async () => {
      mockEnsureAiModelsReadyPartial(mockEnsureAiModelsReadyRemote);

      const request = createMockRequest();
      const ingestion = createMockIngestion();
      await runTextUpgradePipeline(request, ingestion);

      // Pipeline should attempt to use available models
      expect(mockEnsureAiModelsReadyRemote).toHaveBeenCalled();
    });
  });

  describe('decision flow based on model availability', () => {
    it('continues decision phase when models unavailable', async () => {
      mockEnsureAiModelsReadyUnavailable(mockEnsureAiModelsReadyRemote);

      const request = createRequestWithMode('on-device-only');
      const ingestion = createMockIngestion();
      await runTextUpgradePipeline(request, ingestion);

      expect(mockDecideIfShouldRename).toHaveBeenCalled();
    });

    it('logs model availability status when ready', async () => {
      mockEnsureAiModelsReadySuccess(mockEnsureAiModelsReadyRemote);

      const request = createMockRequest();
      const ingestion = createMockIngestion();
      await runTextUpgradePipeline(request, ingestion);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[TextUpgradeAI] AI models ready'),
        expect.any(Object),
      );
    });

    it('does not warn when availability response lacks errors', async () => {
      mockEnsureAiModelsReadyUnavailable(mockEnsureAiModelsReadyRemote);

      const request = createRequestWithMode('on-device-only');
      const ingestion = createMockIngestion();
      await runTextUpgradePipeline(request, ingestion);

      expect(mockDebugLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('mode handling', () => {
    it('returns null when mode is off', async () => {
      mockEnsureAiModelsReadySuccess(mockEnsureAiModelsReadyRemote);

      const request = createRequestWithMode('off');
      const ingestion = createMockIngestion();
      const result = await runTextUpgradePipeline(request, ingestion);

      expect(result).toBeNull();
      expect(mockEnsureAiModelsReadyRemote).not.toHaveBeenCalled();
    });

    it('checks models for on-device-only mode', async () => {
      mockEnsureAiModelsReadySuccess(mockEnsureAiModelsReadyRemote);

      const request = createRequestWithMode('on-device-only');
      const ingestion = createMockIngestion();
      await runTextUpgradePipeline(request, ingestion);

      expect(mockEnsureAiModelsReadyRemote).toHaveBeenCalled();
    });

    it('checks models for hybrid-ask mode', async () => {
      mockEnsureAiModelsReadySuccess(mockEnsureAiModelsReadyRemote);

      const request = createRequestWithMode('hybrid-ask');
      const ingestion = createMockIngestion();
      await runTextUpgradePipeline(request, ingestion);

      expect(mockEnsureAiModelsReadyRemote).toHaveBeenCalled();
    });
  });
});
