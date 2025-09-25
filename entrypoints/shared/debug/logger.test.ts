/**
 * Tests for debug logger functionality
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InstantBaselineEvaluation } from '@/entrypoints/shared/pipeline/instant-baseline-types';
import { debugLogger } from './logger';

// Mock console methods
const consoleSpy = {
  log: vi.fn(),
  group: vi.fn(),
  groupEnd: vi.fn(),
  table: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(console, consoleSpy);
  debugLogger.setEnabled(false);
  debugLogger.setLevel('basic');
});

describe('DebugLogger', () => {
  const buildEvaluation = (
    overrides: Partial<InstantBaselineEvaluation> = {},
  ): InstantBaselineEvaluation => ({
    decision: {
      outcome: 'rename',
      strategy: 'page-title-with-date',
      confidence: 100,
      guardrail: 'strategy-applied',
      reasons: ['strategy:page-title-with-date'],
      signals: { inputsUsed: ['title', 'date'], missingInputs: [] },
    },
    strategy: 'page-title-with-date',
    rename: {
      path: 'Report 2025-04-01.pdf',
      filename: 'Report 2025-04-01.pdf',
      reasonTags: ['PageTitle', 'Date'],
      source: 'metadata',
      originalPath: 'report.pdf',
      fileType: 'pdf',
    },
    reasonTags: ['PageTitle', 'Date'],
    inputsUsed: ['title', 'date'],
    missingInputs: [],
    fileType: 'pdf',
    source: 'metadata',
    originalPath: 'report.pdf',
    subject: 'Report',
    ...overrides,
  });

  const buildContext = () => {
    const evaluation = buildEvaluation();
    return {
      downloadId: debugLogger.createDownloadId(),
      timestamp: Date.now(),
      signals: {
        url: 'https://example.com/report.pdf',
        filename: 'report.pdf',
        mime: 'application/pdf',
        referrer: '',
        startTime: '2025-04-01T08:30:00Z',
        page: {
          title: 'Example Corp — Q2 Report',
          capturedAt: Date.now(),
        },
      },
      evaluation,
      strategy: {
        selected: evaluation.strategy,
        inputs: {
          originalBase: 'report',
          pageTitle: 'Example Corp — Q2 Report',
          isoDate: '2025-04-01',
        },
        generatedFilename: evaluation.rename?.filename,
      },
      processingTime: 2,
    } as const;
  };

  describe('basic functionality', () => {
    it('toggles enablement and levels', () => {
      expect(debugLogger.isEnabled()).toBe(false);
      debugLogger.setEnabled(true);
      expect(debugLogger.isEnabled()).toBe(true);

      debugLogger.setLevel('verbose');
      expect(debugLogger.getLevel()).toBe('verbose');
    });
  });

  describe('context lifecycle', () => {
    beforeEach(() => {
      debugLogger.setEnabled(true);
      debugLogger.setLevel('basic');
    });

    it('stores and retrieves contexts', () => {
      const context = buildContext();
      debugLogger.startContext(context.downloadId, context);

      const stored = debugLogger.getContext(context.downloadId);
      expect(stored).toBeDefined();
      expect(stored?.evaluation.decision.outcome).toBe('rename');
      expect(stored?.strategy.selected).toBe('page-title-with-date');
    });

    it('logs final result on finish', () => {
      const context = buildContext();
      debugLogger.startContext(context.downloadId, context);

      debugLogger.finishContext(context.downloadId, {
        evaluation: buildEvaluation({
          decision: {
            outcome: 'keep',
            strategy: 'page-title-with-date',
            confidence: 0,
            guardrail: 'strategy-unavailable',
            reasons: ['strategy:page-title-with-date', 'missing:title'],
            signals: { inputsUsed: ['date'], missingInputs: ['title'] },
          },
          rename: undefined,
          reasonTags: [],
          inputsUsed: ['date'],
          missingInputs: ['title'],
        }),
        strategy: {
          selected: 'page-title-with-date',
          inputs: {
            originalBase: 'report',
            isoDate: '2025-04-01',
          },
        },
      });

      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('keeps last 10 contexts', () => {
      const contexts = Array.from({ length: 12 }, () => buildContext());
      contexts.forEach((ctx) => {
        debugLogger.startContext(ctx.downloadId, ctx);
        debugLogger.finishContext(ctx.downloadId, ctx);
      });

      expect(debugLogger.getAllContexts().length).toBeLessThanOrEqual(10);
    });
  });
});
