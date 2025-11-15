/**
 * Tests for image-rename-decision.ts
 * Tests AI-powered rename decision logic for images
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
  decideIfImageNeedsRename,
  type RenameDecision,
} from './image-rename-decision';

// Mock dependencies in hoisted callback
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
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    isEnabled: vi.fn().mockReturnValue(true),
    setEnabled: vi.fn(),
  },
}));

vi.mock('../text-analysis/prompt-helpers', () => ({
  createPromptSession: mockCreatePromptSession,
  destroyPromptSession: mockDestroyPromptSession,
  parseStructuredResponse: mockParseStructuredResponse,
}));

vi.mock('@/entrypoints/shared/debug/offscreen-logger', () => ({
  offscreenLogger: mockOffscreenLogger,
}));

let mockConsoleLog: ReturnType<typeof vi.spyOn>;

function createMockDecision(
  overrides: Partial<RenameDecision> = {},
): RenameDecision {
  return {
    shouldRename: true,
    confidence: 0.9,
    reason: 'generic-name',
    explanation: 'Current name is generic',
    ...overrides,
  };
}

describe('image-rename-decision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog?.mockRestore();
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Default mock implementations
    mockCreatePromptSession.mockResolvedValue(mockSession);
    mockSession.prompt.mockResolvedValue(JSON.stringify(createMockDecision()));
    mockParseStructuredResponse.mockReturnValue(createMockDecision());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog?.mockRestore();
  });

  describe('decideIfImageNeedsRename', () => {
    it('returns rename decision when analysis succeeds', async () => {
      const result = await decideIfImageNeedsRename({
        currentFilename: 'IMG_1234.jpg',
        description: 'A sunset over the ocean',
        fileType: 'image',
      });

      expect(result).toEqual({
        shouldRename: true,
        confidence: 0.9,
        reason: 'generic-name',
        explanation: 'Current name is generic',
      });
      expect(mockCreatePromptSession).toHaveBeenCalledOnce();
      expect(mockDestroyPromptSession).toHaveBeenCalledWith(mockSession);
    });

    it('creates session with correct parameters', async () => {
      await decideIfImageNeedsRename({
        currentFilename: 'photo.jpg',
        description: 'A mountain landscape',
        fileType: 'image',
      });

      expect(mockCreatePromptSession).toHaveBeenCalledWith({
        systemPrompt: expect.stringContaining('filename quality analyzer'),
        temperature: 0.4,
        topK: 10,
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
        outputLanguage: 'en',
      });
    });

    it('sends prompt with filename and description context', async () => {
      await decideIfImageNeedsRename({
        currentFilename: 'sunset.jpg',
        description: 'A beautiful sunset over the ocean',
        fileType: 'image',
      });

      expect(mockSession.prompt).toHaveBeenCalledOnce();
      const promptCall = mockSession.prompt.mock.calls[0];
      const promptText = promptCall[0];

      expect(promptText).toContain('"sunset.jpg"');
      expect(promptText).toContain('A beautiful sunset over the ocean');
      expect(promptText).toContain('"image"');
    });

    it('uses response constraint for structured output', async () => {
      await decideIfImageNeedsRename({
        currentFilename: 'test.jpg',
        description: 'Test description',
        fileType: 'image',
      });

      const promptCall = mockSession.prompt.mock.calls[0];
      expect(promptCall[1]).toMatchObject({
        responseConstraint: expect.objectContaining({
          type: 'object',
          properties: expect.objectContaining({
            shouldRename: expect.any(Object),
            confidence: expect.any(Object),
            reason: expect.any(Object),
          }),
        }),
        omitResponseConstraintInput: true,
      });
    });

    it('returns null when session creation fails', async () => {
      mockCreatePromptSession.mockResolvedValue(null);

      const result = await decideIfImageNeedsRename({
        currentFilename: 'test.jpg',
        description: 'Test',
        fileType: 'image',
      });

      expect(result).toBeNull();
      expect(mockOffscreenLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create session'),
      );
      expect(mockDestroyPromptSession).not.toHaveBeenCalled();
    });

    it('returns null when parsing fails', async () => {
      mockParseStructuredResponse.mockReturnValue(null);

      const result = await decideIfImageNeedsRename({
        currentFilename: 'test.jpg',
        description: 'Test',
        fileType: 'image',
      });

      expect(result).toBeNull();
      expect(mockOffscreenLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse decision response'),
        expect.any(Object),
      );
    });

    it('returns null when shouldRename is invalid type', async () => {
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({ shouldRename: 'yes' as unknown as boolean }),
      );

      const result = await decideIfImageNeedsRename({
        currentFilename: 'test.jpg',
        description: 'Test',
        fileType: 'image',
      });

      expect(result).toBeNull();
      expect(mockOffscreenLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid shouldRename value'),
        expect.any(Object),
      );
    });

    it('clamps confidence to valid range', async () => {
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({ confidence: 1.5 }),
      );

      const result = await decideIfImageNeedsRename({
        currentFilename: 'test.jpg',
        description: 'Test',
        fileType: 'image',
      });

      expect(result?.confidence).toBe(1.0);
    });

    it('handles missing confidence with default', async () => {
      mockParseStructuredResponse.mockReturnValue({
        shouldRename: true,
        confidence: undefined as unknown as number,
        reason: 'generic-name',
      });

      const result = await decideIfImageNeedsRename({
        currentFilename: 'test.jpg',
        description: 'Test',
        fileType: 'image',
      });

      expect(result?.confidence).toBe(0.5);
    });

    it('uses unknown reason when missing', async () => {
      mockParseStructuredResponse.mockReturnValue({
        shouldRename: true,
        confidence: 0.8,
        reason: undefined as unknown as string,
      });

      const result = await decideIfImageNeedsRename({
        currentFilename: 'test.jpg',
        description: 'Test',
        fileType: 'image',
      });

      expect(result?.reason).toBe('unknown');
    });

    it('handles errors gracefully', async () => {
      mockSession.prompt.mockRejectedValue(new Error('API error'));

      const result = await decideIfImageNeedsRename({
        currentFilename: 'test.jpg',
        description: 'Test',
        fileType: 'image',
      });

      expect(result).toBeNull();
      expect(mockOffscreenLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Decision making failed'),
        expect.objectContaining({
          error: expect.any(Error),
        }),
      );
      expect(mockDestroyPromptSession).toHaveBeenCalledWith(mockSession);
    });

    it('destroys session even when error occurs', async () => {
      mockSession.prompt.mockRejectedValue(new Error('Test error'));

      await decideIfImageNeedsRename({
        currentFilename: 'test.jpg',
        description: 'Test',
        fileType: 'image',
      });

      expect(mockDestroyPromptSession).toHaveBeenCalledWith(mockSession);
    });

    it('logs token usage information', async () => {
      await decideIfImageNeedsRename({
        currentFilename: 'test.jpg',
        description: 'Test',
        fileType: 'image',
      });

      expect(mockOffscreenLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('initial usage'),
        expect.objectContaining({
          inputUsage: 50,
          inputQuota: 500,
        }),
      );

      expect(mockOffscreenLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Token usage after prompt'),
        expect.objectContaining({
          inputUsage: 50,
          inputQuota: 500,
          percentUsed: '10.0%',
        }),
      );
    });
  });

  describe('Decision reasons', () => {
    it('identifies generic names', async () => {
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({
          shouldRename: true,
          reason: 'generic-name',
          explanation: 'Filename is too generic',
        }),
      );

      const result = await decideIfImageNeedsRename({
        currentFilename: 'image.jpg',
        description: 'A landscape photo',
        fileType: 'image',
      });

      expect(result?.shouldRename).toBe(true);
      expect(result?.reason).toBe('generic-name');
    });

    it('identifies meaningless hashes', async () => {
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({
          shouldRename: true,
          reason: 'meaningless-hash',
          explanation: 'Filename is a hash',
        }),
      );

      const result = await decideIfImageNeedsRename({
        currentFilename: 'IMG_5678.jpg',
        description: 'A portrait photo',
        fileType: 'image',
      });

      expect(result?.reason).toBe('meaningless-hash');
    });

    it('identifies timestamp-only names', async () => {
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({
          shouldRename: true,
          reason: 'timestamp-only',
          explanation: 'Filename is just a timestamp',
        }),
      );

      const result = await decideIfImageNeedsRename({
        currentFilename: '2024-01-15.jpg',
        description: 'A sunset',
        fileType: 'image',
      });

      expect(result?.reason).toBe('timestamp-only');
    });

    it('identifies poor formatting', async () => {
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({
          shouldRename: true,
          reason: 'poor-formatting',
          explanation: 'Filename has poor formatting',
        }),
      );

      const result = await decideIfImageNeedsRename({
        currentFilename: 'ALLCAPSNOSPACESIMAGE.jpg',
        description: 'A photo',
        fileType: 'image',
      });

      expect(result?.reason).toBe('poor-formatting');
    });

    it('recognizes already-descriptive names', async () => {
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({
          shouldRename: false,
          reason: 'already-descriptive',
          explanation: 'Filename already describes content',
          confidence: 0.85,
        }),
      );

      const result = await decideIfImageNeedsRename({
        currentFilename: 'sunset-over-ocean.jpg',
        description: 'A sunset over the ocean',
        fileType: 'image',
      });

      expect(result?.shouldRename).toBe(false);
      expect(result?.reason).toBe('already-descriptive');
    });

    it('recognizes already-good names', async () => {
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({
          shouldRename: false,
          reason: 'already-good',
          explanation: 'Filename is already good',
          confidence: 0.8,
        }),
      );

      const result = await decideIfImageNeedsRename({
        currentFilename: 'vacation-2024.jpg',
        description: 'A vacation photo',
        fileType: 'image',
      });

      expect(result?.shouldRename).toBe(false);
      expect(result?.reason).toBe('already-good');
    });
  });

  describe('Confidence levels', () => {
    it('handles high confidence decisions', async () => {
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({ confidence: 0.95 }),
      );

      const result = await decideIfImageNeedsRename({
        currentFilename: 'test.jpg',
        description: 'Test',
        fileType: 'image',
      });

      expect(result?.confidence).toBe(0.95);
    });

    it('handles low confidence decisions', async () => {
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({ confidence: 0.6 }),
      );

      const result = await decideIfImageNeedsRename({
        currentFilename: 'test.jpg',
        description: 'Test',
        fileType: 'image',
      });

      expect(result?.confidence).toBe(0.6);
    });

    it('clamps negative confidence to 0', async () => {
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({ confidence: -0.5 }),
      );

      const result = await decideIfImageNeedsRename({
        currentFilename: 'test.jpg',
        description: 'Test',
        fileType: 'image',
      });

      expect(result?.confidence).toBe(0);
    });
  });

  describe('Explanation handling', () => {
    it('includes explanation when provided', async () => {
      mockParseStructuredResponse.mockReturnValue(
        createMockDecision({
          explanation: 'Detailed explanation here',
        }),
      );

      const result = await decideIfImageNeedsRename({
        currentFilename: 'test.jpg',
        description: 'Test',
        fileType: 'image',
      });

      expect(result?.explanation).toBe('Detailed explanation here');
    });

    it('handles missing explanation', async () => {
      mockParseStructuredResponse.mockReturnValue({
        shouldRename: true,
        confidence: 0.8,
        reason: 'generic-name',
        explanation: undefined,
      });

      const result = await decideIfImageNeedsRename({
        currentFilename: 'test.jpg',
        description: 'Test',
        fileType: 'image',
      });

      expect(result?.explanation).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('handles very long descriptions', async () => {
      const longDescription = `${'A '.repeat(500)}sunset`;

      const result = await decideIfImageNeedsRename({
        currentFilename: 'test.jpg',
        description: longDescription,
        fileType: 'image',
      });

      expect(result).not.toBeNull();
    });

    it('handles special characters in filename', async () => {
      const result = await decideIfImageNeedsRename({
        currentFilename: 'photo-2024_01_15 (1).jpg',
        description: 'A photo',
        fileType: 'image',
      });

      expect(result).not.toBeNull();
    });

    it('handles unicode characters in description', async () => {
      const result = await decideIfImageNeedsRename({
        currentFilename: 'test.jpg',
        description: 'A café with ☕ emoji',
        fileType: 'image',
      });

      expect(result).not.toBeNull();
    });

    it('handles empty filename', async () => {
      const result = await decideIfImageNeedsRename({
        currentFilename: '',
        description: 'A photo',
        fileType: 'image',
      });

      expect(result).not.toBeNull();
    });
  });

  describe('System prompt', () => {
    it('includes decision guidelines', async () => {
      await decideIfImageNeedsRename({
        currentFilename: 'test.jpg',
        description: 'Test',
        fileType: 'image',
      });

      const sessionCall = mockCreatePromptSession.mock.calls[0][0];
      expect(sessionCall.systemPrompt).toContain('CONSERVATIVE');
      expect(sessionCall.systemPrompt).toContain('Generic names');
      expect(sessionCall.systemPrompt).toContain('Meaningless hashes');
      expect(sessionCall.systemPrompt).toContain('Already descriptive');
    });
  });

  describe('Temperature settings', () => {
    it('uses low temperature for deterministic decisions', async () => {
      await decideIfImageNeedsRename({
        currentFilename: 'test.jpg',
        description: 'Test',
        fileType: 'image',
      });

      const sessionCall = mockCreatePromptSession.mock.calls[0][0];
      expect(sessionCall.temperature).toBe(0.4);
      expect(sessionCall.topK).toBe(10);
    });
  });
});
