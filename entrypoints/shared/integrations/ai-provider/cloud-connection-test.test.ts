/**
 * Tests for cloud AI connection testing functionality
 *
 * Tests cover:
 * - Successful connection with valid API key
 * - Different error scenarios (invalid API key, permission denied, quota exceeded, network failures)
 * - Error pattern matching in parseCloudApiError
 * - Unexpected response handling
 * - Edge cases with the response validation regex
 */

import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import type { CloudModel } from '@/entrypoints/shared/settings/types';
import { testCloudConnection } from './cloud-connection-test';

// Mock the ai-sdk modules
vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(),
}));

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

const mockCreateGoogleGenerativeAI = createGoogleGenerativeAI as Mock;
const mockGenerateText = generateText as Mock;

describe('testCloudConnection', () => {
  const validApiKey = 'AIzaSyB1234567890abcdefghijklmnopqrstu';
  const testModel: CloudModel = 'gemini-flash-lite-latest';

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock setup
    const mockModelInstance = {};
    mockCreateGoogleGenerativeAI.mockReturnValue(() => mockModelInstance);
  });

  describe('successful connection', () => {
    it('returns success when API responds with "OK"', async () => {
      mockGenerateText.mockResolvedValue({ text: 'OK' });

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({ success: true });
      expect(mockCreateGoogleGenerativeAI).toHaveBeenCalledWith({
        apiKey: validApiKey,
      });
      expect(mockGenerateText).toHaveBeenCalledWith({
        model: expect.anything(),
        prompt: 'Reply with exactly: OK',
        temperature: 0,
      });
    });

    it('returns success when API responds with "ok" (lowercase)', async () => {
      mockGenerateText.mockResolvedValue({ text: 'ok' });

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({ success: true });
    });

    it('returns success when API responds with "OK." (with period)', async () => {
      mockGenerateText.mockResolvedValue({ text: 'OK.' });

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({ success: true });
    });

    it('returns success when API responds with "OK!" (with exclamation)', async () => {
      mockGenerateText.mockResolvedValue({ text: 'OK!' });

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({ success: true });
    });

    it('returns success when API responds with "OK?" (with question mark)', async () => {
      mockGenerateText.mockResolvedValue({ text: 'OK?' });

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({ success: true });
    });

    it('returns success when response has leading/trailing whitespace', async () => {
      mockGenerateText.mockResolvedValue({ text: '  OK  ' });

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({ success: true });
    });

    it('returns success when response has mixed case "Ok"', async () => {
      mockGenerateText.mockResolvedValue({ text: 'Ok' });

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({ success: true });
    });
  });

  describe('unexpected response handling', () => {
    it('returns error for completely different response', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Hello, how can I help you?',
      });

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected response from API',
      });
    });

    it('returns error for empty response', async () => {
      mockGenerateText.mockResolvedValue({ text: '' });

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected response from API',
      });
    });

    it('returns error for whitespace-only response', async () => {
      mockGenerateText.mockResolvedValue({ text: '   ' });

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected response from API',
      });
    });

    it('returns error for "OKAY" (not matching regex)', async () => {
      mockGenerateText.mockResolvedValue({ text: 'OKAY' });

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected response from API',
      });
    });

    it('returns error for "OK!!" (multiple punctuation)', async () => {
      mockGenerateText.mockResolvedValue({ text: 'OK!!' });

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected response from API',
      });
    });

    it('returns error for "OK, I understand" (extra text)', async () => {
      mockGenerateText.mockResolvedValue({ text: 'OK, I understand' });

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected response from API',
      });
    });
  });

  describe('API key errors', () => {
    it('returns "Invalid API key" for API_KEY_INVALID error', async () => {
      mockGenerateText.mockRejectedValue(
        new Error('API_KEY_INVALID: The provided API key is not valid'),
      );

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Invalid API key',
      });
    });

    it('returns "Invalid API key" for "API key not valid" error', async () => {
      mockGenerateText.mockRejectedValue(
        new Error('API key not valid. Please pass a valid API key.'),
      );

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Invalid API key',
      });
    });
  });

  describe('permission errors', () => {
    it('returns permission error for PERMISSION_DENIED', async () => {
      mockGenerateText.mockRejectedValue(
        new Error('PERMISSION_DENIED: The caller does not have permission'),
      );

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'API key lacks required permissions',
      });
    });

    it('returns permission error for lowercase "permission" in message', async () => {
      mockGenerateText.mockRejectedValue(
        new Error('You do not have permission to access this resource'),
      );

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'API key lacks required permissions',
      });
    });
  });

  describe('quota and rate limit errors', () => {
    it('returns quota error for QUOTA error', async () => {
      mockGenerateText.mockRejectedValue(
        new Error('QUOTA_EXCEEDED: Resource has been exhausted'),
      );

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'API quota exceeded or rate limited',
      });
    });

    it('returns quota error for lowercase "quota" in message', async () => {
      mockGenerateText.mockRejectedValue(
        new Error('You have exceeded your quota for this API'),
      );

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'API quota exceeded or rate limited',
      });
    });

    it('returns quota error for RATE_LIMIT error', async () => {
      mockGenerateText.mockRejectedValue(
        new Error('RATE_LIMIT_EXCEEDED: Too many requests'),
      );

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'API quota exceeded or rate limited',
      });
    });

    it('returns quota error for "rate limit" in message', async () => {
      mockGenerateText.mockRejectedValue(
        new Error('You have hit the rate limit. Please slow down.'),
      );

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'API quota exceeded or rate limited',
      });
    });
  });

  describe('model not found errors', () => {
    it('returns model error for MODEL_NOT_FOUND', async () => {
      mockGenerateText.mockRejectedValue(
        new Error('MODEL_NOT_FOUND: The specified model does not exist'),
      );

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Model not available for this API key',
      });
    });

    it('returns model error for "not found" in message', async () => {
      mockGenerateText.mockRejectedValue(
        new Error('The requested resource was not found'),
      );

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Model not available for this API key',
      });
    });
  });

  describe('network errors', () => {
    it('returns network error for fetch failure', async () => {
      mockGenerateText.mockRejectedValue(
        new Error('fetch failed: Unable to connect'),
      );

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Network connection failed',
      });
    });

    it('returns network error for network error message', async () => {
      mockGenerateText.mockRejectedValue(
        new Error('network error: Connection refused'),
      );

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Network connection failed',
      });
    });

    it('returns network error for ECONNREFUSED', async () => {
      mockGenerateText.mockRejectedValue(
        new Error('ECONNREFUSED: Connection refused'),
      );

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Network connection failed',
      });
    });
  });

  describe('unknown errors', () => {
    it('returns original error message for unknown error', async () => {
      mockGenerateText.mockRejectedValue(
        new Error('Some unexpected error occurred'),
      );

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Some unexpected error occurred',
      });
    });

    it('returns fallback message for empty error message', async () => {
      mockGenerateText.mockRejectedValue(new Error(''));

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Connection test failed',
      });
    });

    it('handles non-Error objects thrown', async () => {
      mockGenerateText.mockRejectedValue('String error');

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'String error',
      });
    });

    it('handles null thrown', async () => {
      mockGenerateText.mockRejectedValue(null);

      const result = await testCloudConnection(validApiKey, testModel);

      // String(null) = "null", which is truthy so it's returned as-is
      expect(result).toEqual({
        success: false,
        error: 'null',
      });
    });

    it('handles undefined thrown', async () => {
      mockGenerateText.mockRejectedValue(undefined);

      const result = await testCloudConnection(validApiKey, testModel);

      // String(undefined) = "undefined", which is truthy so it's returned as-is
      expect(result).toEqual({
        success: false,
        error: 'undefined',
      });
    });

    it('handles object thrown', async () => {
      mockGenerateText.mockRejectedValue({
        code: 500,
        message: 'Internal error',
      });

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: '[object Object]',
      });
    });
  });

  describe('error pattern priority', () => {
    it('matches first pattern when multiple could match', async () => {
      // This error contains both "API_KEY_INVALID" and "permission"
      // Should match API key error first since it comes first in ERROR_PATTERNS
      mockGenerateText.mockRejectedValue(
        new Error(
          'API_KEY_INVALID: You do not have permission to use this key',
        ),
      );

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Invalid API key',
      });
    });
  });

  describe('model parameter handling', () => {
    it('uses gemini-2.5-flash model correctly', async () => {
      mockGenerateText.mockResolvedValue({ text: 'OK' });
      const model: CloudModel = 'gemini-2.5-flash';

      await testCloudConnection(validApiKey, model);

      expect(mockCreateGoogleGenerativeAI).toHaveBeenCalledWith({
        apiKey: validApiKey,
      });
    });

    it('uses gemini-flash-lite-latest model correctly', async () => {
      mockGenerateText.mockResolvedValue({ text: 'OK' });
      const model: CloudModel = 'gemini-flash-lite-latest';

      await testCloudConnection(validApiKey, model);

      expect(mockCreateGoogleGenerativeAI).toHaveBeenCalledWith({
        apiKey: validApiKey,
      });
    });
  });

  describe('response validation regex edge cases', () => {
    it('rejects "O K" (space in middle)', async () => {
      mockGenerateText.mockResolvedValue({ text: 'O K' });

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected response from API',
      });
    });

    it('rejects "0K" (zero instead of O)', async () => {
      mockGenerateText.mockResolvedValue({ text: '0K' });

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected response from API',
      });
    });

    it('rejects "OK:" (colon punctuation)', async () => {
      mockGenerateText.mockResolvedValue({ text: 'OK:' });

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected response from API',
      });
    });

    it('rejects "OK," (comma punctuation)', async () => {
      mockGenerateText.mockResolvedValue({ text: 'OK,' });

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected response from API',
      });
    });

    it('rejects "OK;" (semicolon punctuation)', async () => {
      mockGenerateText.mockResolvedValue({ text: 'OK;' });

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected response from API',
      });
    });

    it('rejects "OKay" (partial word)', async () => {
      mockGenerateText.mockResolvedValue({ text: 'OKay' });

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected response from API',
      });
    });

    it('rejects "K" (missing O)', async () => {
      mockGenerateText.mockResolvedValue({ text: 'K' });

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected response from API',
      });
    });

    it('rejects "O" (missing K)', async () => {
      mockGenerateText.mockResolvedValue({ text: 'O' });

      const result = await testCloudConnection(validApiKey, testModel);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected response from API',
      });
    });
  });
});
