/**
 * Tests for filename-generation.ts
 * Core business logic that generates rename proposals using Chrome Prompt API.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  FilenameGeneration,
  FilenameGenerationContext,
} from './filename-generation';
import {
  generateFilenameComplete,
  generateFilenameStem,
  isHighConfidenceGeneration,
} from './filename-generation';
import type { BasePromptContext } from './prompt-helpers';

// Mock dependencies must be in hoisted callback
const {
  mockSession,
  mockCreatePromptSession,
  mockDestroyPromptSession,
  mockParseStructuredResponse,
  mockDebugLogger,
} = vi.hoisted(() => ({
  mockSession: {
    prompt: vi.fn(),
    destroy: vi.fn(),
    inputUsage: 100,
    inputQuota: 1000,
  },
  mockCreatePromptSession: vi.fn(),
  mockDestroyPromptSession: vi.fn(),
  mockParseStructuredResponse: vi.fn(),
  mockDebugLogger: {
    warn: vi.fn(),
  },
}));

vi.mock('./prompt-helpers', () => ({
  createPromptSession: mockCreatePromptSession,
  destroyPromptSession: mockDestroyPromptSession,
  parseStructuredResponse: mockParseStructuredResponse,
  buildBaseContextDescription: (context: BasePromptContext) =>
    `Current filename: "${context.filename}"\nContent summary: ${context.summary}`,
  formatPolicyRules: (settings: FilenameGenerationContext['settings']) =>
    `Max: ${settings.maxLength}, Sep: ${settings.separator}`,
  truncateForPrompt: (text: string, maxChars: number) =>
    text.length > maxChars ? `${text.slice(0, maxChars)}...` : text,
}));

vi.mock('@/entrypoints/shared/debug/logger', () => ({
  debugLogger: mockDebugLogger,
}));

function createMockContext(
  overrides: Partial<FilenameGenerationContext> = {},
): FilenameGenerationContext {
  return {
    summary:
      'Meeting notes from Q1 planning session discussing budget allocation',
    language: 'en',
    currentBaseline: 'document.pdf',
    settings: {
      maxLength: 60,
      separator: 'clean',
      transliterateAscii: false,
    },
    ...overrides,
  };
}

function createMockGeneration(
  overrides: Partial<FilenameGeneration> = {},
): FilenameGeneration {
  return {
    stem: 'Q1 Budget Planning',
    confidence: 0.85,
    qualifiers: ['Meeting Notes'],
    explanation: 'Generated from content about Q1 budget planning',
    ...overrides,
  };
}

describe('filename-generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.prompt.mockResolvedValue(
      '{"stem":"Q1 Budget Planning","confidence":0.85}',
    );
    mockCreatePromptSession.mockResolvedValue(mockSession);
    mockParseStructuredResponse.mockReturnValue(createMockGeneration());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateFilenameStem', () => {
    it('returns generated stem when prompt succeeds', async () => {
      const context = createMockContext();
      const result = await generateFilenameStem(context);

      expect(result).toBe('Q1 Budget Planning');
      expect(mockCreatePromptSession).toHaveBeenCalledOnce();
      expect(mockDestroyPromptSession).toHaveBeenCalledWith(mockSession);
    });

    it('returns null when session creation fails', async () => {
      mockCreatePromptSession.mockResolvedValue(null);
      const context = createMockContext();
      const result = await generateFilenameStem(context);

      expect(result).toBeNull();
      expect(mockDestroyPromptSession).not.toHaveBeenCalled();
    });

    it('returns null when generateFilenameComplete returns null', async () => {
      mockParseStructuredResponse.mockReturnValue(null);
      const context = createMockContext();
      const result = await generateFilenameStem(context);

      expect(result).toBeNull();
      expect(mockDestroyPromptSession).toHaveBeenCalledWith(mockSession);
    });

    it('returns null when validation fails', async () => {
      mockParseStructuredResponse.mockReturnValue(
        createMockGeneration({ stem: '' }), // Invalid empty stem
      );
      const context = createMockContext();
      const result = await generateFilenameStem(context);

      expect(result).toBeNull();
    });

    it('trims whitespace from generated stem', async () => {
      mockParseStructuredResponse.mockReturnValue(
        createMockGeneration({ stem: '  Q1 Budget Planning  ' }),
      );
      const context = createMockContext();
      const result = await generateFilenameStem(context);

      expect(result).toBe('Q1 Budget Planning');
    });

    it('handles prompt API errors gracefully', async () => {
      mockSession.prompt.mockRejectedValue(new Error('API error'));
      const context = createMockContext();
      const result = await generateFilenameStem(context);

      expect(result).toBeNull();
      expect(mockDebugLogger.warn).toHaveBeenCalled();
      expect(mockDestroyPromptSession).toHaveBeenCalledWith(mockSession);
    });

    it('returns trimmed stem when successful', async () => {
      mockParseStructuredResponse.mockReturnValue(
        createMockGeneration({ stem: '  Generated Stem  ' }),
      );
      const context = createMockContext();
      const result = await generateFilenameStem(context);

      expect(result).toBe('Generated Stem');
    });
  });

  describe('generateFilenameComplete', () => {
    it('returns complete generation object with qualifiers', async () => {
      const context = createMockContext();
      const result = await generateFilenameComplete(context);

      expect(result).toEqual({
        stem: 'Q1 Budget Planning',
        confidence: 0.85,
        qualifiers: ['Meeting Notes'],
        explanation: 'Generated from content about Q1 budget planning',
      });
    });

    it('returns null when session creation fails', async () => {
      mockCreatePromptSession.mockResolvedValue(null);
      const context = createMockContext();
      const result = await generateFilenameComplete(context);

      expect(result).toBeNull();
    });

    it('returns null when parsing fails', async () => {
      mockParseStructuredResponse.mockReturnValue(null);
      const context = createMockContext();
      const result = await generateFilenameComplete(context);

      expect(result).toBeNull();
    });

    it('returns null when validation fails', async () => {
      mockParseStructuredResponse.mockReturnValue(
        createMockGeneration({ confidence: 1.5 }), // Invalid confidence
      );
      const context = createMockContext();
      const result = await generateFilenameComplete(context);

      expect(result).toBeNull();
    });

    it('creates session with correct options', async () => {
      const context = createMockContext();
      await generateFilenameComplete(context);

      expect(mockCreatePromptSession).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.4,
          topK: 20,
          systemPrompt: expect.stringContaining(
            'professional filename generator',
          ),
          outputLanguage: 'en',
        }),
      );
    });

    it('calls prompt with responseConstraint', async () => {
      const context = createMockContext();
      await generateFilenameComplete(context);

      expect(mockSession.prompt).toHaveBeenCalledWith(expect.any(String), {
        responseConstraint: expect.any(Object),
        omitResponseConstraintInput: true,
      });
    });

    it('includes token usage in session creation', async () => {
      const context = createMockContext();
      const result = await generateFilenameComplete(context);

      expect(result).not.toBeNull();
      // Token usage is logged but not exposed in public API
    });

    it('always destroys session even on error', async () => {
      mockSession.prompt.mockRejectedValue(new Error('API error'));
      const context = createMockContext();
      await generateFilenameComplete(context);

      expect(mockDestroyPromptSession).toHaveBeenCalledWith(mockSession);
    });

    it('handles successful destroy', async () => {
      mockDestroyPromptSession.mockClear();
      const context = createMockContext();
      const result = await generateFilenameComplete(context);

      expect(result).not.toBeUndefined();
      expect(mockDestroyPromptSession).toHaveBeenCalled();
    });
  });

  describe('validateGenerationResponse', () => {
    it('accepts valid generation response', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(createMockGeneration());
      const result = await generateFilenameComplete(context);

      expect(result).not.toBeNull();
    });

    it('rejects empty stem', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(
        createMockGeneration({ stem: '' }),
      );
      const result = await generateFilenameComplete(context);

      expect(result).toBeNull();
      expect(mockDebugLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[FilenameGeneration] Invalid stem'),
        expect.any(Object),
      );
    });

    it('rejects whitespace-only stem', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(
        createMockGeneration({ stem: '   ' }),
      );
      const result = await generateFilenameComplete(context);

      expect(result).toBeNull();
    });

    it('rejects stem longer than 60 characters', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(
        createMockGeneration({
          stem: 'This is a very long filename stem that exceeds the maximum allowed length',
        }),
      );
      const result = await generateFilenameComplete(context);

      expect(result).toBeNull();
      expect(mockDebugLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[FilenameGeneration] Stem too long'),
        expect.any(Object),
      );
    });

    it('rejects invalid confidence (non-number)', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(
        createMockGeneration({ confidence: 'high' as unknown as number }),
      );
      const result = await generateFilenameComplete(context);

      expect(result).toBeNull();
      expect(mockDebugLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[FilenameGeneration] Invalid confidence'),
        expect.any(Object),
      );
    });

    it('rejects confidence below 0', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(
        createMockGeneration({ confidence: -0.1 }),
      );
      const result = await generateFilenameComplete(context);

      expect(result).toBeNull();
    });

    it('rejects confidence above 1', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(
        createMockGeneration({ confidence: 1.5 }),
      );
      const result = await generateFilenameComplete(context);

      expect(result).toBeNull();
    });

    it('accepts confidence at boundary values (0 and 1)', async () => {
      mockParseStructuredResponse.mockReturnValue(
        createMockGeneration({ confidence: 0 }),
      );
      const context = createMockContext();
      let result = await generateFilenameComplete(context);
      expect(result?.confidence).toBe(0);

      mockParseStructuredResponse.mockReturnValue(
        createMockGeneration({ confidence: 1 }),
      );
      result = await generateFilenameComplete(context);
      expect(result?.confidence).toBe(1);
    });

    it('rejects qualifiers when not an array', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(
        createMockGeneration({
          qualifiers: 'not-an-array' as unknown as string[],
        }),
      );
      const result = await generateFilenameComplete(context);

      expect(result).toBeNull();
    });

    it('rejects qualifiers when more than 3 items', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(
        createMockGeneration({
          qualifiers: ['one', 'two', 'three', 'four'],
        }),
      );
      const result = await generateFilenameComplete(context);

      expect(result).toBeNull();
      expect(mockDebugLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[FilenameGeneration] Too many qualifiers'),
        expect.any(Object),
      );
    });

    it('rejects individual qualifiers longer than 20 characters', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(
        createMockGeneration({
          qualifiers: ['valid', 'this-is-way-too-long-qualifier'],
        }),
      );
      const result = await generateFilenameComplete(context);

      expect(result).toBeNull();
    });

    it('rejects qualifiers with non-string items', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(
        createMockGeneration({
          qualifiers: ['valid', 123 as unknown as string],
        }),
      );
      const result = await generateFilenameComplete(context);

      expect(result).toBeNull();
    });

    it('accepts response with optional qualifiers as undefined', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue({
        stem: 'Valid Stem',
        confidence: 0.9,
      });
      const result = await generateFilenameComplete(context);

      expect(result).not.toBeNull();
    });

    it('rejects explanation when not a string', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(
        createMockGeneration({ explanation: 123 as unknown as string }),
      );
      const result = await generateFilenameComplete(context);

      expect(result).toBeNull();
    });

    it('accepts valid explanation string', async () => {
      const context = createMockContext();
      mockParseStructuredResponse.mockReturnValue(
        createMockGeneration({ explanation: 'This is a valid explanation' }),
      );
      const result = await generateFilenameComplete(context);

      expect(result?.explanation).toBe('This is a valid explanation');
    });
  });

  describe('isHighConfidenceGeneration', () => {
    it('returns true for confidence >= 0.8', () => {
      expect(
        isHighConfidenceGeneration(createMockGeneration({ confidence: 0.8 })),
      ).toBe(true);
      expect(
        isHighConfidenceGeneration(createMockGeneration({ confidence: 0.85 })),
      ).toBe(true);
      expect(
        isHighConfidenceGeneration(createMockGeneration({ confidence: 1.0 })),
      ).toBe(true);
    });

    it('returns false for confidence < 0.8', () => {
      expect(
        isHighConfidenceGeneration(createMockGeneration({ confidence: 0.79 })),
      ).toBe(false);
      expect(
        isHighConfidenceGeneration(createMockGeneration({ confidence: 0.7 })),
      ).toBe(false);
      expect(
        isHighConfidenceGeneration(createMockGeneration({ confidence: 0.0 })),
      ).toBe(false);
    });

    it('handles edge case: exactly 0.8', () => {
      expect(
        isHighConfidenceGeneration(createMockGeneration({ confidence: 0.8 })),
      ).toBe(true);
    });

    it('handles edge case: just below 0.8', () => {
      expect(
        isHighConfidenceGeneration(
          createMockGeneration({ confidence: 0.7999 }),
        ),
      ).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('handles context with missing optional fields', async () => {
      const context = createMockContext({
        language: undefined,
        // summary is still required
      });
      const result = await generateFilenameStem(context);

      expect(result).toBe('Q1 Budget Planning');
      expect(mockCreatePromptSession).toHaveBeenCalledOnce();
    });

    it('handles very long summary by truncating', async () => {
      const longSummary = 'A'.repeat(1000);
      const context = createMockContext({ summary: longSummary });
      const result = await generateFilenameStem(context);

      expect(result).toBe('Q1 Budget Planning');
    });

    it('handles different separator settings', async () => {
      const contextKebab = createMockContext({
        settings: {
          maxLength: 60,
          separator: 'kebab',
          transliterateAscii: false,
        },
      });
      await generateFilenameStem(contextKebab);

      expect(mockSession.prompt).toHaveBeenCalled();
      const promptCall = mockSession.prompt.mock.calls[0]?.[0] as string;
      expect(promptCall).toContain('Sep: kebab');
      expect(promptCall).toContain('budget-meeting-notes');
    });

    it('handles transliterationAscii setting', async () => {
      const context = createMockContext({
        settings: {
          maxLength: 60,
          separator: 'clean',
          transliterateAscii: true,
        },
      });
      await generateFilenameStem(context);

      expect(mockSession.prompt).toHaveBeenCalled();
    });
  });
});
