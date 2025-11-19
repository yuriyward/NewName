/**
 * Tests for rename-decision.ts
 * Critical decision logic that determines if renaming is needed.
 * Confidence thresholds directly impact UX.
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
import type { BasePromptContext } from './prompt-helpers';
import { decideIfShouldRename } from './rename-decision';
import type {
  RenameDecision,
  RenameDecisionContext,
  RenameDecisionReason,
} from './rename-decision-types';

// Mock dependencies must be in hoisted callback
const {
  mockSession,
  mockCreatePromptSession,
  mockDestroyPromptSession,
  mockParseStructuredResponse,
  mockOffscreenLogger,
} = vi.hoisted(() => ({
  mockSession: {
    prompt: vi.fn(),
    destroy: vi.fn(),
    inputUsage: 50,
    inputQuota: 500,
  },
  mockCreatePromptSession: vi.fn(),
  mockDestroyPromptSession: vi.fn(),
  mockParseStructuredResponse: vi.fn(),
  mockOffscreenLogger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    isEnabled: vi.fn().mockReturnValue(true),
    setEnabled: vi.fn(),
  },
}));

vi.mock('./prompt-helpers', () => ({
  createPromptSession: mockCreatePromptSession,
  destroyPromptSession: mockDestroyPromptSession,
  parseStructuredResponse: mockParseStructuredResponse,
  buildBaseContextDescription: (context: BasePromptContext) =>
    `Current filename: "${context.filename}"\nContent summary: ${context.summary}`,
}));

vi.mock('@/entrypoints/shared/debug/offscreen-logger', () => ({
  offscreenLogger: mockOffscreenLogger,
}));

let mockConsoleLog: ReturnType<typeof vi.spyOn>;

function createMockContext(
  overrides: Partial<RenameDecisionContext> = {},
): RenameDecisionContext {
  return {
    currentFilename: 'document.pdf',
    summary: 'Meeting notes from Q1 planning session',
    language: 'en',
    originalName: 'document.pdf',
    fileType: 'pdf',
    ...overrides,
  };
}

function createMockDecision(
  overrides: Partial<RenameDecision> = {},
): RenameDecision {
  return {
    shouldRename: true,
    confidence: 0.85,
    reason: 'generic-name',
    explanation: 'Generic filename suggests renaming',
    ...overrides,
  };
}

describe('rename-decision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog?.mockRestore();
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockSession.prompt.mockResolvedValue(
      '{"shouldRename":true,"confidence":0.85,"reason":"generic-name"}',
    );
    mockCreatePromptSession.mockResolvedValue(mockSession);
    mockParseStructuredResponse.mockReturnValue(createMockDecision());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog?.mockRestore();
  });

  describe('decideIfShouldRename', () => {
    it('returns decision when prompt succeeds', async () => {
      const context = createMockContext();
      const result = await decideIfShouldRename(context);

      expect(result).toEqual({
        shouldRename: true,
        confidence: 0.85,
        reason: 'generic-name',
        explanation: 'Generic filename suggests renaming',
      });
      expect(mockCreatePromptSession).toHaveBeenCalledOnce();
      expect(mockDestroyPromptSession).toHaveBeenCalledWith(mockSession);
    });

    it('returns null when session creation fails', async () => {
      mockCreatePromptSession.mockResolvedValue(null);
      const context = createMockContext();
      const result = await decideIfShouldRename(context);

      expect(result).toBeNull();
      expect(mockDestroyPromptSession).not.toHaveBeenCalled();
    });

    it('returns null when parsing fails', async () => {
      mockParseStructuredResponse.mockReturnValue(null);
      const context = createMockContext();
      const result = await decideIfShouldRename(context);

      expect(result).toBeNull();
      expect(mockDestroyPromptSession).toHaveBeenCalledWith(mockSession);
    });

    it('returns null when validation fails', async () => {
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({ shouldRename: 'yes' as unknown as boolean }), // Invalid type
      );
      const context = createMockContext();
      const result = await decideIfShouldRename(context);

      expect(result).toBeNull();
    });

    it('creates session with low temperature for deterministic decisions', async () => {
      const context = createMockContext();
      await decideIfShouldRename(context);

      expect(mockCreatePromptSession).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.2, // Low for determinism
          topK: 10,
          systemPrompt: expect.stringContaining('filename quality analyzer'),
          outputLanguage: 'en', // Always English for decisions
        }),
      );
    });

    it('calls prompt with responseConstraint', async () => {
      const context = createMockContext();
      await decideIfShouldRename(context);

      expect(mockSession.prompt).toHaveBeenCalledWith(expect.any(String), {
        responseConstraint: expect.any(Object),
        omitResponseConstraintInput: true,
      });
    });

    it('logs token usage after prompt', async () => {
      const context = createMockContext();
      await decideIfShouldRename(context);

      // Token usage is logged via offscreenLogger in the actual code
      expect(mockOffscreenLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('[RenameDecision] Token usage after prompt'),
        expect.objectContaining({
          inputUsage: 50,
          inputQuota: 500,
          percentUsed: '10.0%',
        }),
      );
    });

    it('logs decision details when successful', async () => {
      const context = createMockContext();
      await decideIfShouldRename(context);

      expect(mockOffscreenLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('[RenameDecision] Decision made'),
        expect.objectContaining({
          shouldRename: true,
          confidence: 0.85,
          reason: 'generic-name',
        }),
      );
    });

    it('always destroys session even on error', async () => {
      mockSession.prompt.mockRejectedValue(new Error('API error'));
      const context = createMockContext();
      await decideIfShouldRename(context);

      expect(mockDestroyPromptSession).toHaveBeenCalledWith(mockSession);
    });

    it('propagates errors when session destruction fails', async () => {
      mockDestroyPromptSession.mockImplementation(() => {
        throw new Error('Destroy failed');
      });
      const context = createMockContext();
      await expect(decideIfShouldRename(context)).rejects.toThrow(
        'Destroy failed',
      );
    });

    it('handles prompt API errors gracefully', async () => {
      mockSession.prompt.mockRejectedValue(new Error('API error'));
      const context = createMockContext();
      const result = await decideIfShouldRename(context);

      expect(result).toBeNull();
      expect(mockOffscreenLogger.warn).toHaveBeenCalled();
    });
  });

  describe('validateDecisionResponse', () => {
    it('accepts valid decision response', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(createMockDecision());
      const result = await decideIfShouldRename(context);

      expect(result).not.toBeNull();
    });

    it('rejects invalid shouldRename type (non-boolean)', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({ shouldRename: 'true' as unknown as boolean }),
      );
      const result = await decideIfShouldRename(context);

      expect(result).toBeNull();
      expect(mockOffscreenLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[RenameDecision] Invalid shouldRename type'),
        expect.any(Object),
      );
    });

    it('accepts both true and false for shouldRename', async () => {
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({ shouldRename: true }),
      );
      const context = createMockContext();
      let result = await decideIfShouldRename(context);
      expect(result?.shouldRename).toBe(true);

      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({ shouldRename: false }),
      );
      result = await decideIfShouldRename(context);
      expect(result?.shouldRename).toBe(false);
    });

    it('rejects invalid confidence type (non-number)', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({ confidence: 'high' as unknown as number }),
      );
      const result = await decideIfShouldRename(context);

      expect(result).toBeNull();
      expect(mockOffscreenLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[RenameDecision] Invalid confidence value'),
        expect.any(Object),
      );
    });

    it('rejects confidence below 0', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({ confidence: -0.1 }),
      );
      const result = await decideIfShouldRename(context);

      expect(result).toBeNull();
    });

    it('rejects confidence above 1', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({ confidence: 1.5 }),
      );
      const result = await decideIfShouldRename(context);

      expect(result).toBeNull();
    });

    it('accepts confidence at boundary values (0 and 1)', async () => {
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({ confidence: 0 }),
      );
      const context = createMockContext();
      let result = await decideIfShouldRename(context);
      expect(result?.confidence).toBe(0);

      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({ confidence: 1 }),
      );
      result = await decideIfShouldRename(context);
      expect(result?.confidence).toBe(1);
    });

    it('accepts all valid reason values', async () => {
      const validReasons: RenameDecisionReason[] = [
        'generic-name',
        'meaningless-hash',
        'already-descriptive',
        'contains-topic',
        'timestamp-only',
        'poor-formatting',
      ];

      for (const reason of validReasons) {
        mockParseStructuredResponse.mockReturnValue(
          createMockDecision({ reason }),
        );
        const context = createMockContext();
        const result = await decideIfShouldRename(context);

        expect(result?.reason).toBe(reason);
      }
    });

    it('rejects invalid reason value', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({
          reason: 'unknown-reason' as unknown as RenameDecisionReason,
        }),
      );
      const result = await decideIfShouldRename(context);

      expect(result).toBeNull();
      expect(mockOffscreenLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[RenameDecision] Invalid reason value'),
        expect.any(Object),
      );
    });

    it('rejects explanation when not a string', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({ explanation: 123 as unknown as string }),
      );
      const result = await decideIfShouldRename(context);

      expect(result).toBeNull();
    });

    it('accepts response without optional explanation', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({ explanation: undefined }),
      );
      const result = await decideIfShouldRename(context);

      expect(result).not.toBeNull();
      expect(result?.explanation).toBeUndefined();
    });

    it('accepts valid explanation string', async () => {
      const context = createMockContext();
      const explanation = 'File has generic name that should be improved';
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({ explanation }),
      );
      const result = await decideIfShouldRename(context);

      expect(result?.explanation).toBe(explanation);
    });
  });

  describe('decision confidence thresholds (UX-critical)', () => {
    it('handles decisions with high confidence (> 0.8)', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({ confidence: 0.95 }),
      );
      const result = await decideIfShouldRename(context);

      expect(result?.confidence).toBe(0.95);
      // High confidence decisions could be auto-applied
    });

    it('handles decisions with moderate confidence (0.5-0.8)', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({ confidence: 0.65 }),
      );
      const result = await decideIfShouldRename(context);

      expect(result?.confidence).toBe(0.65);
      // Moderate confidence decisions should prompt user
    });

    it('handles decisions with low confidence (< 0.5)', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({ confidence: 0.3 }),
      );
      const result = await decideIfShouldRename(context);

      expect(result?.confidence).toBe(0.3);
      // Low confidence decisions should be discarded
    });

    it('differentiates between rename=true and rename=false with confidence', async () => {
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({
          shouldRename: true,
          confidence: 0.9,
          reason: 'generic-name',
        }),
      );
      const context = createMockContext();
      let result = await decideIfShouldRename(context);
      expect(result?.shouldRename).toBe(true);
      expect(result?.confidence).toBe(0.9);

      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({
          shouldRename: false,
          confidence: 0.8,
          reason: 'already-descriptive',
        }),
      );
      result = await decideIfShouldRename(context);
      expect(result?.shouldRename).toBe(false);
      expect(result?.confidence).toBe(0.8);
    });
  });

  describe('decision reason types', () => {
    it('uses generic-name reason for generic filenames', async () => {
      const context = createMockContext({
        currentFilename: 'document.pdf',
      });
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({
          shouldRename: true,
          reason: 'generic-name',
          explanation: 'File named "document" - too generic',
        }),
      );
      const result = await decideIfShouldRename(context);

      expect(result?.reason).toBe('generic-name');
    });

    it('uses meaningless-hash reason for UUID/hash filenames', async () => {
      const context = createMockContext({
        currentFilename: '550e8400-e29b-41d4-a716-446655440000.pdf',
      });
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({
          shouldRename: true,
          reason: 'meaningless-hash',
          explanation: 'UUID with no descriptive value',
        }),
      );
      const result = await decideIfShouldRename(context);

      expect(result?.reason).toBe('meaningless-hash');
    });

    it('uses already-descriptive reason for good filenames', async () => {
      const context = createMockContext({
        currentFilename: 'Q1-Budget-Planning-Meeting-Notes.pdf',
      });
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({
          shouldRename: false,
          reason: 'already-descriptive',
          confidence: 0.95,
        }),
      );
      const result = await decideIfShouldRename(context);

      expect(result?.reason).toBe('already-descriptive');
      expect(result?.shouldRename).toBe(false);
    });

    it('uses poor-formatting reason for badly formatted filenames', async () => {
      const context = createMockContext({
        currentFilename: 'FILEINALLCAPS_123--456.pdf',
      });
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({
          shouldRename: true,
          reason: 'poor-formatting',
          explanation: 'All caps with inconsistent separators',
        }),
      );
      const result = await decideIfShouldRename(context);

      expect(result?.reason).toBe('poor-formatting');
    });
  });

  describe('conservative decision-making', () => {
    it('prefers keeping existing names when uncertain', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({
          shouldRename: false,
          confidence: 0.6,
          reason: 'already-descriptive',
          explanation: 'Uncertain, but leaning toward keeping name',
        }),
      );
      const result = await decideIfShouldRename(context);

      expect(result?.shouldRename).toBe(false);
    });

    it('handles context without summary gracefully', async () => {
      const context = createMockContext({
        summary: undefined,
      });
      mockParseStructuredResponse.mockReturnValue(createMockDecision());
      const result = await decideIfShouldRename(context);

      expect(result).not.toBeNull();
    });

    it('handles different file types appropriately', async () => {
      const fileTypes: RenameDecisionContext['fileType'][] = [
        'pdf',
        'image',
        'audio',
        'video',
        'office',
        'archive',
        'data',
      ];

      for (const fileType of fileTypes) {
        mockParseStructuredResponse.mockReturnValue(createMockDecision());
        const context = createMockContext({ fileType });
        const result = await decideIfShouldRename(context);

        expect(result?.reason).toBeDefined();
      }
    });
  });

  describe('integration scenarios', () => {
    it('processes decision from real API response structure', async () => {
      const context = createMockContext();
      const apiResponse = {
        shouldRename: true,
        confidence: 0.78,
        reason: 'timestamp-only',
        explanation: 'Filename contains only date, no content description',
      };
      mockParseStructuredResponse.mockReturnValue(apiResponse);
      const result = await decideIfShouldRename(context);

      expect(result).toEqual(apiResponse);
    });

    it('handles decision for file without language detection', async () => {
      const context = createMockContext({
        language: undefined,
      });
      mockParseStructuredResponse.mockReturnValue(createMockDecision());
      const result = await decideIfShouldRename(context);

      expect(result).not.toBeNull();
    });

    it('handles decision for file with special characters in name', async () => {
      const context = createMockContext({
        currentFilename: 'file_with-special.chars@#$.pdf',
      });
      mockParseStructuredResponse.mockReturnValue(createMockDecision());
      const result = await decideIfShouldRename(context);

      expect(result).not.toBeNull();
    });
  });
});
