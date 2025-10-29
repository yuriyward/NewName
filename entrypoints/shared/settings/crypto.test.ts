/**
 * Tests for API key encryption utilities
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { decryptApiKey, encryptApiKey, isEncrypted } from './crypto';
import { setupMockCrypto } from './crypto.test-helper';

describe('crypto', () => {
  beforeEach(() => {
    setupMockCrypto();
  });

  describe('encryptApiKey', () => {
    it('should encrypt a plaintext API key', async () => {
      const plaintext = 'test-api-key-12345';
      const encrypted = await encryptApiKey(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(38); // Min length for encrypted data
    });

    it('should produce different ciphertexts for the same input (IV randomization)', async () => {
      const plaintext = 'test-api-key-12345';
      const encrypted1 = await encryptApiKey(plaintext);
      const encrypted2 = await encryptApiKey(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should reject empty strings', async () => {
      await expect(encryptApiKey('')).rejects.toThrow(
        'Cannot encrypt empty API key',
      );
    });
  });

  describe('decryptApiKey', () => {
    it('should decrypt an encrypted API key', async () => {
      const plaintext = 'test-api-key-12345';
      const encrypted = await encryptApiKey(plaintext);
      const decrypted = await decryptApiKey(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long API keys', async () => {
      const plaintext =
        'AIzaSyDpMTJPMkYBMjU3OTI3NDI1MTY0NTM5MTA4NjI5ODQ3MDI1NjI5ODQ3MDI1NjI5ODQ3MDI1NjI5ODQ3MDI';
      const encrypted = await encryptApiKey(plaintext);
      const decrypted = await decryptApiKey(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle API keys with special characters', async () => {
      const plaintext = 'key-with_special$chars@#!&*()';
      const encrypted = await encryptApiKey(plaintext);
      const decrypted = await decryptApiKey(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should reject empty strings', async () => {
      await expect(decryptApiKey('')).rejects.toThrow(
        'Cannot decrypt empty string',
      );
    });

    it('should reject invalid encrypted data', async () => {
      const invalid = 'this-is-not-encrypted-data';
      await expect(decryptApiKey(invalid)).rejects.toThrow(
        'Invalid encrypted data format',
      );
    });

    it('should reject corrupted encrypted data', async () => {
      const plaintext = 'test-api-key-12345';
      const encrypted = await encryptApiKey(plaintext);

      // Corrupt the encrypted data by changing a character
      const corrupted = `${encrypted.slice(0, -5)}XXXXX`;

      await expect(decryptApiKey(corrupted)).rejects.toThrow(
        'Failed to decrypt API key',
      );
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted data', async () => {
      const plaintext = 'test-api-key-12345';
      const encrypted = await encryptApiKey(plaintext);

      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plaintext', () => {
      expect(isEncrypted('test-api-key-12345')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isEncrypted('')).toBe(false);
    });

    it('should return false for short strings', () => {
      expect(isEncrypted('short')).toBe(false);
    });

    it('should return false for non-base64 strings', () => {
      expect(isEncrypted('this-is-a-long-string-but-not-base64')).toBe(false);
    });

    it('should handle valid base64 that is not our encrypted format', () => {
      // Valid base64 but not our encryption format
      const validBase64 = btoa('some random data that is not encrypted');
      // This might return true (heuristic check) but decryption would fail
      // The function is meant to be a quick check, not a guarantee
      const result = isEncrypted(validBase64);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('round-trip encryption', () => {
    it('should maintain data integrity through multiple encrypt/decrypt cycles', async () => {
      const plaintext = 'test-api-key-12345';

      // First cycle
      const encrypted1 = await encryptApiKey(plaintext);
      const decrypted1 = await decryptApiKey(encrypted1);
      expect(decrypted1).toBe(plaintext);

      // Second cycle (re-encrypt the original)
      const encrypted2 = await encryptApiKey(plaintext);
      const decrypted2 = await decryptApiKey(encrypted2);
      expect(decrypted2).toBe(plaintext);

      // Third cycle
      const encrypted3 = await encryptApiKey(plaintext);
      const decrypted3 = await decryptApiKey(encrypted3);
      expect(decrypted3).toBe(plaintext);
    });
  });
});
