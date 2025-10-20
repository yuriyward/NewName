/**
 * Tests for image-description.ts
 * Tests multimodal Prompt API description generation
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
import { describeImage } from './image-description';

// Mock dependencies in hoisted callback
const {
  mockSession,
  mockCreatePromptSession,
  mockDestroyPromptSession,
  mockDebugLogger,
} = vi.hoisted(() => ({
  mockSession: {
    prompt: vi.fn(),
    destroy: vi.fn(),
    inputUsage: 50,
    inputQuota: 500,
  },
  mockCreatePromptSession: vi.fn(),
  mockDestroyPromptSession: vi.fn(),
  mockDebugLogger: {
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  },
}));

vi.mock('../text-analysis/prompt-helpers', () => ({
  createPromptSession: mockCreatePromptSession,
  destroyPromptSession: mockDestroyPromptSession,
}));

vi.mock('@/entrypoints/shared/debug/logger', () => ({
  debugLogger: mockDebugLogger,
}));

let mockConsoleLog: ReturnType<typeof vi.spyOn>;
let mockConsoleError: ReturnType<typeof vi.spyOn>;

describe('image-description', () => {
  let mockImageBlob: Blob;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog?.mockRestore();
    mockConsoleError?.mockRestore();
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create mock image blob
    mockImageBlob = new Blob(['fake-image-data'], { type: 'image/png' });

    // Default mock implementations
    mockCreatePromptSession.mockResolvedValue(mockSession);
    mockSession.prompt.mockResolvedValue(
      'A colorful sunset over the ocean with sailboats.',
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog?.mockRestore();
    mockConsoleError?.mockRestore();
  });

  describe('describeImage', () => {
    it('successfully generates image description', async () => {
      const result = await describeImage(mockImageBlob);

      expect(result).not.toBeNull();
      expect(result?.description).toBe(
        'A colorful sunset over the ocean with sailboats.',
      );
      expect(result?.confidence).toBe(0.8); // Baseline confidence
    });

    it('creates multimodal session with correct parameters', async () => {
      await describeImage(mockImageBlob);

      expect(mockCreatePromptSession).toHaveBeenCalledOnce();
      expect(mockCreatePromptSession).toHaveBeenCalledWith({
        systemPrompt: expect.stringContaining('precise image analyst'),
        temperature: 0.4,
        topK: 10,
        expectedInputs: [{ type: 'image' }, { type: 'text' }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
        outputLanguage: 'en',
      });
    });

    it('sends prompt with multimodal content format', async () => {
      await describeImage(mockImageBlob);

      expect(mockSession.prompt).toHaveBeenCalledOnce();
      const promptArg = mockSession.prompt.mock.calls[0][0];

      expect(promptArg).toEqual([
        {
          role: 'user',
          content: [
            {
              type: 'text',
              value: expect.stringContaining('Analyze this image'),
            },
            {
              type: 'image',
              value: mockImageBlob,
            },
          ],
        },
      ]);
    });

    it('destroys session after completion', async () => {
      await describeImage(mockImageBlob);

      expect(mockDestroyPromptSession).toHaveBeenCalledOnce();
      expect(mockDestroyPromptSession).toHaveBeenCalledWith(mockSession);
    });

    it('trims whitespace from description', async () => {
      mockSession.prompt.mockResolvedValue('  Description with spaces  \n');

      const result = await describeImage(mockImageBlob);

      expect(result?.description).toBe('Description with spaces');
    });

    it('returns null when session creation fails', async () => {
      mockCreatePromptSession.mockResolvedValue(null);

      const result = await describeImage(mockImageBlob);

      expect(result).toBeNull();
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining(
          'Check chrome://flags/#prompt-api-for-gemini-nano-multimodal-input',
        ),
      );
      expect(mockDestroyPromptSession).not.toHaveBeenCalled();
    });

    it('returns null when description is empty', async () => {
      mockSession.prompt.mockResolvedValue('');

      const result = await describeImage(mockImageBlob);

      expect(result).toBeNull();
      expect(mockDebugLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Empty description'),
      );
    });

    it('returns null when description is only whitespace', async () => {
      mockSession.prompt.mockResolvedValue('   \n\t   ');

      const result = await describeImage(mockImageBlob);

      expect(result).toBeNull();
      expect(mockDebugLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Empty description'),
      );
    });

    it('handles prompt API errors gracefully', async () => {
      mockSession.prompt.mockRejectedValue(new Error('API quota exceeded'));

      const result = await describeImage(mockImageBlob);

      expect(result).toBeNull();
      expect(mockDebugLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('description generation failed'),
        expect.objectContaining({
          error: expect.any(Error),
        }),
      );
      expect(mockDestroyPromptSession).toHaveBeenCalledWith(mockSession);
    });

    it('destroys session even when error occurs', async () => {
      mockSession.prompt.mockRejectedValue(new Error('Test error'));

      await describeImage(mockImageBlob);

      expect(mockDestroyPromptSession).toHaveBeenCalledWith(mockSession);
    });

    it('logs blob size and type', async () => {
      await describeImage(mockImageBlob);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Creating multimodal session'),
        expect.objectContaining({
          blobSize: mockImageBlob.size,
          blobType: 'image/png',
        }),
      );
    });

    it('logs elapsed time on success', async () => {
      await describeImage(mockImageBlob);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Description generated'),
        expect.objectContaining({
          description: expect.any(String),
          elapsedMs: expect.any(Number),
        }),
      );
    });
  });

  describe('Description quality', () => {
    it('handles short descriptions', async () => {
      mockSession.prompt.mockResolvedValue('A cat.');

      const result = await describeImage(mockImageBlob);

      expect(result).not.toBeNull();
      expect(result?.description).toBe('A cat.');
      expect(result?.confidence).toBe(0.8);
    });

    it('handles long descriptions', async () => {
      const longDescription =
        'A highly detailed panoramic photograph showing a vibrant sunset ' +
        'over a calm ocean with multiple sailboats in the distance and ' +
        'dramatic cloud formations in the sky.';
      mockSession.prompt.mockResolvedValue(longDescription);

      const result = await describeImage(mockImageBlob);

      expect(result).not.toBeNull();
      expect(result?.description).toBe(longDescription);
    });

    it('handles descriptions with special characters', async () => {
      mockSession.prompt.mockResolvedValue(
        'A photo of "Sunset Beach" with $100 sign & more.',
      );

      const result = await describeImage(mockImageBlob);

      expect(result?.description).toBe(
        'A photo of "Sunset Beach" with $100 sign & more.',
      );
    });

    it('handles descriptions with newlines', async () => {
      mockSession.prompt.mockResolvedValue('Line 1\nLine 2\nLine 3');

      const result = await describeImage(mockImageBlob);

      // Description should be trimmed but preserve internal structure
      expect(result?.description).toBe('Line 1\nLine 2\nLine 3');
    });

    it('handles descriptions with unicode characters', async () => {
      mockSession.prompt.mockResolvedValue('A beautiful café with ☕ and 🥐.');

      const result = await describeImage(mockImageBlob);

      expect(result?.description).toBe('A beautiful café with ☕ and 🥐.');
    });
  });

  describe('Confidence levels', () => {
    it('always returns baseline confidence of 0.8', async () => {
      mockSession.prompt.mockResolvedValue('Description 1');
      const result1 = await describeImage(mockImageBlob);
      expect(result1?.confidence).toBe(0.8);

      mockSession.prompt.mockResolvedValue('Description 2');
      const result2 = await describeImage(mockImageBlob);
      expect(result2?.confidence).toBe(0.8);
    });
  });

  describe('Edge cases', () => {
    it('handles very large blob', async () => {
      const largeData = new Array(1024 * 1024).fill('x').join('');
      const largeBlob = new Blob([largeData], {
        type: 'image/png',
      });

      const result = await describeImage(largeBlob);

      expect(result).not.toBeNull();
    });

    it('handles non-Error exceptions', async () => {
      mockSession.prompt.mockRejectedValue('String error');

      const result = await describeImage(mockImageBlob);

      expect(result).toBeNull();
      expect(mockDestroyPromptSession).toHaveBeenCalledWith(mockSession);
    });

    it('handles session creation returning null with warning', async () => {
      mockCreatePromptSession.mockResolvedValue(null);

      await describeImage(mockImageBlob);

      expect(mockDebugLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create multimodal session'),
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('chrome://flags'),
      );
    });
  });

  describe('System prompt', () => {
    it('includes guidelines for description generation', async () => {
      await describeImage(mockImageBlob);

      const sessionCall = mockCreatePromptSession.mock.calls[0][0];
      expect(sessionCall.systemPrompt).toContain('precise image analyst');
      expect(sessionCall.systemPrompt).toContain('1-2 sentences');
      expect(sessionCall.systemPrompt).toContain('120 characters');
      expect(sessionCall.systemPrompt).toContain('No metadata');
    });
  });

  describe('Temperature and creativity settings', () => {
    it('uses low temperature for more deterministic descriptions', async () => {
      await describeImage(mockImageBlob);

      const sessionCall = mockCreatePromptSession.mock.calls[0][0];
      expect(sessionCall.temperature).toBe(0.4);
      expect(sessionCall.topK).toBe(10);
    });
  });
});
