import { describe, expect, it } from 'vitest';
import { validateGeminiApiKeyFormat } from './validation';

describe('validateGeminiApiKeyFormat', () => {
  describe('valid API keys', () => {
    it('accepts valid key with minimum length (35 chars)', () => {
      // AIza + 31 more chars = 35 total
      const key = `AIza${'a'.repeat(31)}`;
      expect(validateGeminiApiKeyFormat(key)).toBe(true);
    });

    it('accepts valid key with typical length (39 chars)', () => {
      // AIza + 35 more chars = 39 total (typical Gemini key length)
      const key = 'AIza' + 'SyB1234567890abcdefghijklmnopqrstu';
      expect(validateGeminiApiKeyFormat(key)).toBe(true);
    });

    it('accepts valid key with maximum length (45 chars)', () => {
      // AIza + 41 more chars = 45 total
      const key = `AIza${'a'.repeat(41)}`;
      expect(validateGeminiApiKeyFormat(key)).toBe(true);
    });

    it('accepts key with mixed alphanumeric characters', () => {
      const key = 'AIzaSyB-1234_abcdEFGH5678ijklMNOPqr';
      expect(key.length).toBeGreaterThanOrEqual(35);
      expect(validateGeminiApiKeyFormat(key)).toBe(true);
    });

    it('trims whitespace before validation', () => {
      const key = `  AIza${'a'.repeat(31)}  `;
      expect(validateGeminiApiKeyFormat(key)).toBe(true);
    });
  });

  describe('invalid prefix', () => {
    it('rejects key not starting with AIza', () => {
      const key = `XXXX${'a'.repeat(35)}`;
      expect(validateGeminiApiKeyFormat(key)).toBe(false);
    });

    it('rejects key with lowercase aiza prefix', () => {
      const key = `aiza${'a'.repeat(35)}`;
      expect(validateGeminiApiKeyFormat(key)).toBe(false);
    });

    it('rejects key with partial prefix AIz (no fourth char)', () => {
      // AIz + 'b' repeated = AIzbb... which doesn't start with AIza
      const key = `AIz${'b'.repeat(36)}`;
      expect(validateGeminiApiKeyFormat(key)).toBe(false);
    });

    it('rejects key starting with AI but not AIza', () => {
      const key = `AIxy${'a'.repeat(35)}`;
      expect(validateGeminiApiKeyFormat(key)).toBe(false);
    });
  });

  describe('invalid length', () => {
    it('rejects key that is too short (34 chars)', () => {
      const key = `AIza${'a'.repeat(30)}`; // 34 total
      expect(key.length).toBe(34);
      expect(validateGeminiApiKeyFormat(key)).toBe(false);
    });

    it('rejects key that is too long (46 chars)', () => {
      const key = `AIza${'a'.repeat(42)}`; // 46 total
      expect(key.length).toBe(46);
      expect(validateGeminiApiKeyFormat(key)).toBe(false);
    });

    it('rejects very short key', () => {
      expect(validateGeminiApiKeyFormat('AIza')).toBe(false);
    });

    it('rejects very long key', () => {
      const key = `AIza${'a'.repeat(100)}`;
      expect(validateGeminiApiKeyFormat(key)).toBe(false);
    });
  });

  describe('edge cases - null and undefined', () => {
    it('rejects null', () => {
      expect(validateGeminiApiKeyFormat(null)).toBe(false);
    });

    it('rejects undefined (via type coercion)', () => {
      // TypeScript would catch this, but testing runtime behavior
      expect(validateGeminiApiKeyFormat(undefined as unknown as string)).toBe(
        false,
      );
    });
  });

  describe('edge cases - empty and whitespace', () => {
    it('rejects empty string', () => {
      expect(validateGeminiApiKeyFormat('')).toBe(false);
    });

    it('rejects whitespace-only string', () => {
      expect(validateGeminiApiKeyFormat('   ')).toBe(false);
    });

    it('rejects string that becomes too short after trimming', () => {
      const key = `  AIza${'a'.repeat(28)}  `; // 34 chars after trim
      expect(validateGeminiApiKeyFormat(key)).toBe(false);
    });
  });

  describe('type checking behavior', () => {
    it('rejects number input', () => {
      expect(validateGeminiApiKeyFormat(12345 as unknown as string)).toBe(
        false,
      );
    });

    it('rejects object input', () => {
      expect(validateGeminiApiKeyFormat({} as unknown as string)).toBe(false);
    });

    it('rejects array input', () => {
      expect(validateGeminiApiKeyFormat([] as unknown as string)).toBe(false);
    });

    it('rejects boolean input', () => {
      expect(validateGeminiApiKeyFormat(true as unknown as string)).toBe(false);
    });
  });
});
