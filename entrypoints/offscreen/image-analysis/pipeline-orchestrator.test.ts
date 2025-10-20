/**
 * Tests for pipeline-orchestrator.ts
 * Integration tests for the complete image upgrade pipeline
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ImageIngestionResult,
  ImageUpgradeAnalysisRequest,
} from '@/entrypoints/shared/integrations/image-analysis/types';
import { runImageUpgradePipeline } from './pipeline-orchestrator';

// Mock dependencies in hoisted callback
const {
  mockCheckMultimodalAvailability,
  mockRunDescribePhase,
  mockRunDecidePhase,
  mockRunGeneratePhase,
  mockBuildProposalFromAnalysis,
} = vi.hoisted(() => ({
  mockCheckMultimodalAvailability: vi.fn(),
  mockRunDescribePhase: vi.fn(),
  mockRunDecidePhase: vi.fn(),
  mockRunGeneratePhase: vi.fn(),
  mockBuildProposalFromAnalysis: vi.fn(),
}));

vi.mock('./model-availability', () => ({
  checkMultimodalAvailability: mockCheckMultimodalAvailability,
  buildSessionCreationFailureResponse: vi.fn(() => ({
    status: 'unavailable',
    requestId: 'test-request-id',
    analyzedAt: Date.now(),
    reason: 'multimodal-unsupported',
    message: 'Multimodal API not available',
  })),
}));

vi.mock('./pipeline-phases', () => ({
  runDescribePhase: mockRunDescribePhase,
  runDecidePhase: mockRunDecidePhase,
  runGeneratePhase: mockRunGeneratePhase,
}));

vi.mock('./proposal-builder', () => ({
  buildProposalFromAnalysis: mockBuildProposalFromAnalysis,
}));

let mockConsoleLog: ReturnType<typeof vi.spyOn>;

function createMockRequest(
  overrides: Partial<ImageUpgradeAnalysisRequest> = {},
): ImageUpgradeAnalysisRequest {
  return {
    requestId: 'test-request-id',
    historyId: 'hist-123',
    downloadId: 42,
    url: 'https://example.com/image.jpg',
    filename: 'IMG_1234.jpg',
    relativePath: 'Downloads/IMG_1234.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 1024 * 500,
    fileType: 'image',
    baseline: {
      original: 'IMG_1234.jpg',
      final: 'IMG_1234.jpg',
      decision: undefined,
    },
    settings: {
      mode: 'on-device-only',
      maxBytes: 1024 * 1024 * 10,
      maxFilenameLength: 100,
      separator: 'kebab',
      transliterateAscii: false,
    },
    ...overrides,
  };
}

function createMockIngestion(
  overrides: Partial<ImageIngestionResult> = {},
): ImageIngestionResult {
  return {
    status: 'ingested',
    requestId: 'test-request-id',
    analyzedAt: Date.now(),
    blob: new Blob(['fake-png'], { type: 'image/png' }),
    mimeType: 'image/png',
    originalWidth: 2048,
    originalHeight: 1536,
    resizedWidth: 1024,
    resizedHeight: 768,
    resizeRatio: 0.5,
    originalSizeBytes: 1024 * 500,
    metrics: {
      readBytes: 1024 * 500,
      elapsedMs: 150,
    },
    ...overrides,
  };
}

describe('pipeline-orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog?.mockRestore();
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Default mock implementations
    mockCheckMultimodalAvailability.mockResolvedValue(null); // Available
    mockRunDescribePhase.mockResolvedValue({
      description: 'A sunset over the ocean',
      confidence: 0.8,
    });
    mockRunDecidePhase.mockResolvedValue({
      shouldRename: true,
      reason: 'generic-name',
      confidence: 0.9,
      explanation: 'Current name is generic',
    });
    mockRunGeneratePhase.mockResolvedValue({
      stem: 'sunset-over-ocean',
      elapsedMs: 250,
    });
    mockBuildProposalFromAnalysis.mockReturnValue({
      status: 'success',
      requestId: 'test-request-id',
      analyzedAt: Date.now(),
      proposal: {
        type: 'rename',
        newName: 'sunset-over-ocean.jpg',
      },
      description: 'A sunset over the ocean',
      modelSource: 'on-device',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockConsoleLog?.mockRestore();
  });

  describe('Successful pipeline execution', () => {
    it('completes full pipeline when all phases succeed', async () => {
      const request = createMockRequest();
      const ingestion = createMockIngestion();

      const result = await runImageUpgradePipeline(request, ingestion);

      expect(result).not.toBeNull();
      expect(result?.status).toBe('success');
      expect(mockCheckMultimodalAvailability).toHaveBeenCalledWith(
        'test-request-id',
      );
      expect(mockRunDescribePhase).toHaveBeenCalledWith(
        ingestion.blob,
        'test-request-id',
      );
      expect(mockRunDecidePhase).toHaveBeenCalled();
      expect(mockRunGeneratePhase).toHaveBeenCalled();
      expect(mockBuildProposalFromAnalysis).toHaveBeenCalled();
    });

    it('passes correct parameters to describe phase', async () => {
      const request = createMockRequest();
      const ingestion = createMockIngestion();

      await runImageUpgradePipeline(request, ingestion);

      expect(mockRunDescribePhase).toHaveBeenCalledWith(
        ingestion.blob,
        'test-request-id',
      );
    });

    it('passes correct parameters to decide phase', async () => {
      const request = createMockRequest();
      const ingestion = createMockIngestion();

      await runImageUpgradePipeline(request, ingestion);

      expect(mockRunDecidePhase).toHaveBeenCalledWith(
        request,
        'A sunset over the ocean',
      );
    });

    it('passes correct parameters to generate phase', async () => {
      const request = createMockRequest();
      const ingestion = createMockIngestion();

      await runImageUpgradePipeline(request, ingestion);

      expect(mockRunGeneratePhase).toHaveBeenCalledWith(
        request,
        'A sunset over the ocean',
      );
    });

    it('passes all results to proposal builder', async () => {
      const request = createMockRequest();
      const ingestion = createMockIngestion();

      await runImageUpgradePipeline(request, ingestion);

      expect(mockBuildProposalFromAnalysis).toHaveBeenCalledWith(
        request,
        ingestion,
        { description: 'A sunset over the ocean', confidence: 0.8 },
        {
          shouldRename: true,
          reason: 'generic-name',
          confidence: 0.9,
          explanation: 'Current name is generic',
        },
        { stem: 'sunset-over-ocean', elapsedMs: 250 },
        expect.any(Number), // Total elapsed time
      );
    });

    it('logs multimodal API readiness', async () => {
      const request = createMockRequest();
      const ingestion = createMockIngestion();

      await runImageUpgradePipeline(request, ingestion);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Multimodal API ready'),
        expect.objectContaining({
          requestId: 'test-request-id',
          imageSize: '2048x1536',
          resizedSize: '1024x768',
        }),
      );
    });
  });

  describe('Mode handling', () => {
    it('returns null when mode is off', async () => {
      const request = createMockRequest({
        settings: {
          ...createMockRequest().settings,
          mode: 'off',
        },
      });
      const ingestion = createMockIngestion();

      const result = await runImageUpgradePipeline(request, ingestion);

      expect(result).toBeNull();
      expect(mockCheckMultimodalAvailability).not.toHaveBeenCalled();
    });

    it('returns unavailable when API not available in on-device-only mode', async () => {
      mockCheckMultimodalAvailability.mockResolvedValue({
        status: 'unavailable',
        requestId: 'test-request-id',
        analyzedAt: Date.now(),
        reason: 'multimodal-unsupported',
        message: 'Multimodal API not available',
      });

      const request = createMockRequest({
        settings: {
          ...createMockRequest().settings,
          mode: 'on-device-only',
        },
      });
      const ingestion = createMockIngestion();

      const result = await runImageUpgradePipeline(request, ingestion);

      expect(result?.status).toBe('unavailable');
    });

    it('returns null when API not available in hybrid mode', async () => {
      mockCheckMultimodalAvailability.mockResolvedValue({
        status: 'unavailable',
        requestId: 'test-request-id',
        analyzedAt: Date.now(),
        reason: 'multimodal-unsupported',
      });

      const request = createMockRequest({
        settings: {
          ...createMockRequest().settings,
          mode: 'hybrid-ask',
        },
      });
      const ingestion = createMockIngestion();

      const result = await runImageUpgradePipeline(request, ingestion);

      expect(result).toBeNull();
    });
  });

  describe('Early exit scenarios', () => {
    it('returns unavailable when describe phase fails', async () => {
      mockRunDescribePhase.mockResolvedValue(null);

      const request = createMockRequest();
      const ingestion = createMockIngestion();

      const result = await runImageUpgradePipeline(request, ingestion);

      expect(result?.status).toBe('unavailable');
      expect(mockRunDecidePhase).not.toHaveBeenCalled();
      expect(mockRunGeneratePhase).not.toHaveBeenCalled();
    });

    it('returns null when decide phase returns null', async () => {
      mockRunDecidePhase.mockResolvedValue(null);

      const request = createMockRequest();
      const ingestion = createMockIngestion();

      const result = await runImageUpgradePipeline(request, ingestion);

      expect(result).toBeNull();
      expect(mockRunGeneratePhase).not.toHaveBeenCalled();
      expect(mockBuildProposalFromAnalysis).not.toHaveBeenCalled();
    });

    it('returns null when shouldRename is false', async () => {
      mockRunDecidePhase.mockResolvedValue({
        shouldRename: false,
        reason: 'already-good',
        confidence: 0.8,
      });

      const request = createMockRequest();
      const ingestion = createMockIngestion();

      const result = await runImageUpgradePipeline(request, ingestion);

      expect(result).toBeNull();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Keeping baseline filename'),
        expect.objectContaining({
          requestId: 'test-request-id',
          filename: 'IMG_1234.jpg',
          reason: 'already-good',
        }),
      );
      expect(mockRunGeneratePhase).not.toHaveBeenCalled();
    });
  });

  describe('Phase execution order', () => {
    it('executes phases in correct order', async () => {
      const callOrder: string[] = [];

      mockCheckMultimodalAvailability.mockImplementation(async () => {
        callOrder.push('availability');
        return null;
      });
      mockRunDescribePhase.mockImplementation(async () => {
        callOrder.push('describe');
        return { description: 'Test', confidence: 0.8 };
      });
      mockRunDecidePhase.mockImplementation(async () => {
        callOrder.push('decide');
        return {
          shouldRename: true,
          reason: 'generic-name',
          confidence: 0.9,
        };
      });
      mockRunGeneratePhase.mockImplementation(async () => {
        callOrder.push('generate');
        return { stem: 'test', elapsedMs: 100 };
      });
      mockBuildProposalFromAnalysis.mockImplementation(() => {
        callOrder.push('build');
        return { status: 'success' };
      });

      const request = createMockRequest();
      const ingestion = createMockIngestion();

      await runImageUpgradePipeline(request, ingestion);

      expect(callOrder).toEqual([
        'availability',
        'describe',
        'decide',
        'generate',
        'build',
      ]);
    });
  });

  describe('PDF context handling', () => {
    it('includes PDF context when present', async () => {
      const request = createMockRequest({
        pdfContext: {
          documentTitle: 'Annual Report 2024',
          shouldPrioritizeTitle: true,
        },
      });
      const ingestion = createMockIngestion();

      await runImageUpgradePipeline(request, ingestion);

      expect(mockRunDecidePhase).toHaveBeenCalledWith(
        expect.objectContaining({
          pdfContext: {
            documentTitle: 'Annual Report 2024',
            shouldPrioritizeTitle: true,
          },
        }),
        expect.any(String),
      );
    });

    it('works without PDF context', async () => {
      const request = createMockRequest();
      const ingestion = createMockIngestion();

      const result = await runImageUpgradePipeline(request, ingestion);

      expect(result).not.toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('handles empty description', async () => {
      mockRunDescribePhase.mockResolvedValue({
        description: '',
        confidence: 0.8,
      });

      const request = createMockRequest();
      const ingestion = createMockIngestion();

      await runImageUpgradePipeline(request, ingestion);

      expect(mockRunDecidePhase).toHaveBeenCalledWith(request, '');
    });

    it('handles null generated stem', async () => {
      mockRunGeneratePhase.mockResolvedValue({
        stem: null,
        elapsedMs: 100,
      });

      const request = createMockRequest();
      const ingestion = createMockIngestion();

      await runImageUpgradePipeline(request, ingestion);

      expect(mockBuildProposalFromAnalysis).toHaveBeenCalledWith(
        request,
        ingestion,
        expect.any(Object),
        expect.any(Object),
        { stem: null, elapsedMs: 100 },
        expect.any(Number),
      );
    });
  });
});
