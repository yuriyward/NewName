import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ImageIngestionResult,
  ImageUpgradeAnalysisRequest,
} from '@/entrypoints/shared/integrations/image-analysis/types';
import type {
  DecidePhaseResult,
  DescribePhaseResult,
  GeneratePhaseResult,
} from './pipeline-phases';
import {
  buildProposalFromAnalysis,
  buildProposalFromPhase3Inputs,
} from './proposal-builder';

type FilenameBuilderMocks = {
  buildFilename: ReturnType<typeof vi.fn>;
  buildProposalSummary: ReturnType<typeof vi.fn>;
  buildProposedPath: ReturnType<typeof vi.fn>;
  extractStemFromBaseline: ReturnType<typeof vi.fn>;
  formatReasonTags: ReturnType<typeof vi.fn>;
};

const filenameBuilderMocks = vi.hoisted(() => ({
  buildFilename: vi.fn(),
  buildProposalSummary: vi.fn(() => 'summary'),
  buildProposedPath: vi.fn(() => '/proposed/path'),
  extractStemFromBaseline: vi.fn(() => 'subject'),
  formatReasonTags: vi.fn(() => ['ai']),
})) satisfies FilenameBuilderMocks;

vi.mock('../text-analysis/filename-builder', () => filenameBuilderMocks);

const getFilenameBuilderMocks = (): FilenameBuilderMocks =>
  filenameBuilderMocks;

function createRequest(
  overrides: Partial<ImageUpgradeAnalysisRequest> = {},
): ImageUpgradeAnalysisRequest {
  return {
    requestId: 'req-1',
    historyId: 'hist-1',
    downloadId: 42,
    url: 'https://example.com/file.jpg',
    filename: 'Sunset.JPG',
    relativePath: 'Downloads/Sunset.JPG',
    mimeType: 'image/jpeg',
    sizeBytes: 1024,
    fileType: 'image',
    baseline: {
      original: 'Sunset.JPG',
      final: 'Sunset.JPG',
      decision: undefined,
    },
    settings: {
      mode: 'on-device-only',
      maxBytes: 5_000_000,
      maxFilenameLength: 80,
      separator: 'kebab',
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
    ...overrides,
  };
}

function createIngestion(): ImageIngestionResult {
  return {
    status: 'ingested',
    requestId: 'req-1',
    analyzedAt: Date.now(),
    blob: new Blob(['fake']),
    mimeType: 'image/png',
    originalWidth: 1000,
    originalHeight: 800,
    resizedWidth: 800,
    resizedHeight: 640,
    resizeRatio: 0.8,
    originalSizeBytes: 1234,
    metrics: {
      readBytes: 1234,
      elapsedMs: 150,
    },
  };
}

describe('proposal-builder keep-baseline semantics', () => {
  beforeEach(() => {
    const mocks = getFilenameBuilderMocks();
    for (const mockFn of Object.values(mocks)) {
      mockFn.mockReset();
    }
    mocks.buildFilename.mockReturnValue({ filename: 'sunset.jpg' });
  });

  it('returns keep-baseline when final filename matches baseline in buildProposalFromAnalysis', () => {
    const request = createRequest();
    const ingestion = createIngestion();
    const describeResult: DescribePhaseResult = {
      description: 'Warm sunset over the ocean',
      confidence: 0.9,
    };
    const decideResult: DecidePhaseResult = {
      shouldRename: true,
      reason: 'generic-name',
      confidence: 0.85,
      explanation: 'Baseline lacks detail',
    };
    const generateResult: GeneratePhaseResult = {
      stem: 'Sunset',
      elapsedMs: 75,
    };

    const result = buildProposalFromAnalysis(
      request,
      ingestion,
      describeResult,
      decideResult,
      generateResult,
      50,
    );

    expect(result).toEqual(
      expect.objectContaining({
        status: 'keep-baseline',
        reason: 'same-as-baseline',
        baselineFilename: 'Sunset.JPG',
      }),
    );
  });

  it('returns keep-baseline when Phase3 output matches baseline in buildProposalFromPhase3Inputs', () => {
    const request = createRequest();
    const ingestion = createIngestion();

    const result = buildProposalFromPhase3Inputs(
      request,
      ingestion,
      'Warm sunset over the ocean',
      'Sunset',
      0.82,
      true,
    );

    expect(result).toEqual(
      expect.objectContaining({
        status: 'keep-baseline',
        reason: 'same-as-baseline',
      }),
    );
  });
});
