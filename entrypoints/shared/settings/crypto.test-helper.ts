/**
 * Fast mock crypto implementation for testing
 * Bypasses expensive PBKDF2 and AES operations while maintaining format compatibility
 */
import { vi } from 'vitest';

const ENCRYPTION_PREFIX = 'enc:v1:';

/**
 * Simple checksum for mock authentication (simulates AES-GCM auth tag)
 */
function calculateChecksum(data: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum = (sum + data[i]) & 0xff;
  }
  return sum;
}

/**
 * Fast mock encryption - just base64 encode with prefix and checksum
 */
export async function mockEncrypt(plaintext: string): Promise<string> {
  if (!plaintext || plaintext.length === 0) {
    throw new Error('Cannot encrypt empty API key');
  }

  // Create a deterministic "IV" and "ciphertext" format that matches real encryption
  // but without the expensive crypto operations
  const mockIv = new Uint8Array(12).fill(1); // 12 bytes like real AES-GCM IV
  const textBytes = new TextEncoder().encode(plaintext);

  // Calculate checksum to detect corruption (simulates AES-GCM authentication)
  const checksum = calculateChecksum(textBytes);

  // Combine IV + plaintext + checksum (in real version, this would be IV + ciphertext + auth tag)
  const combined = new Uint8Array(mockIv.length + textBytes.length + 1);
  combined.set(mockIv, 0);
  combined.set(textBytes, mockIv.length);
  combined[combined.length - 1] = checksum;

  const base64 = btoa(String.fromCharCode(...combined));
  return `${ENCRYPTION_PREFIX}${base64}`;
}

/**
 * Fast mock decryption - just base64 decode and extract plaintext
 * Validates data structure and checksum to detect corruption
 */
export async function mockDecrypt(encrypted: string): Promise<string> {
  if (!encrypted || encrypted.length === 0) {
    throw new Error('Cannot decrypt empty string');
  }

  if (!encrypted.startsWith(ENCRYPTION_PREFIX)) {
    throw new Error(
      'Invalid encrypted data format - missing encryption prefix',
    );
  }

  try {
    const base64Data = encrypted.slice(ENCRYPTION_PREFIX.length);
    const combined = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Validate minimum length (IV + at least 1 byte of data + checksum)
    if (combined.length < 14) {
      throw new Error('Data too short');
    }

    // Validate IV format (should be all 1s in our mock)
    const iv = combined.slice(0, 12);
    const expectedIv = new Uint8Array(12).fill(1);
    const ivMatches = iv.every((byte, i) => byte === expectedIv[i]);

    if (!ivMatches) {
      throw new Error('Invalid IV - data corrupted');
    }

    // Extract plaintext (skip the 12-byte mock IV, exclude last byte checksum)
    const plaintext = combined.slice(12, -1);
    const storedChecksum = combined[combined.length - 1];

    // Verify checksum (simulates AES-GCM authentication)
    const expectedChecksum = calculateChecksum(plaintext);
    if (storedChecksum !== expectedChecksum) {
      throw new Error('Authentication failed - data corrupted');
    }

    // Try to decode as UTF-8 - will throw if corrupted
    const decoder = new TextDecoder('utf-8', { fatal: true });
    return decoder.decode(plaintext);
  } catch (error) {
    throw new Error(
      `Failed to decrypt API key: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
  }
}

/**
 * Setup mock crypto for tests
 * Call this in beforeEach to replace real crypto operations with fast mocks
 *
 * The mocks simulate authenticated encryption (like AES-GCM) by:
 * - Storing plaintext with a checksum
 * - Verifying checksum on decrypt to detect tampering
 */
export function setupMockCrypto() {
  // Mock the deriveKey operation to return instantly
  const mockKey: CryptoKey = {
    type: 'secret',
    extractable: false,
    algorithm: { name: 'AES-GCM', length: 256 },
    usages: ['encrypt', 'decrypt'],
  } as CryptoKey;

  // Track encrypted payloads with their checksums
  const encryptedData = new Map<string, number>();

  // Store original methods
  const originalImportKey = crypto.subtle.importKey;
  const originalDeriveKey = crypto.subtle.deriveKey;
  const originalEncrypt = crypto.subtle.encrypt;
  const originalDecrypt = crypto.subtle.decrypt;

  // Mock importKey (used in key derivation)
  crypto.subtle.importKey = vi.fn(async () => mockKey);

  // Mock deriveKey (expensive PBKDF2 operation)
  crypto.subtle.deriveKey = vi.fn(async () => mockKey);

  // Mock encrypt (fast operation with checksum)
  crypto.subtle.encrypt = vi.fn(async (_algorithm, _key, data) => {
    const plaintext = new Uint8Array(data as ArrayBuffer);

    // Calculate checksum for authentication
    const checksum = calculateChecksum(plaintext);

    // Create authenticated ciphertext: plaintext + checksum
    const authenticated = new Uint8Array(plaintext.length + 1);
    authenticated.set(plaintext, 0);
    authenticated[authenticated.length - 1] = checksum;

    // Store checksum mapped to the plaintext for later verification
    const key = Array.from(plaintext).join(',');
    encryptedData.set(key, checksum);

    return authenticated.buffer;
  });

  // Mock decrypt (fast operation with checksum verification)
  crypto.subtle.decrypt = vi.fn(async (_algorithm, _key, data) => {
    const authenticated = new Uint8Array(data as ArrayBuffer);

    // Extract plaintext and checksum
    const plaintext = authenticated.slice(0, -1);
    const storedChecksum = authenticated[authenticated.length - 1];

    // Verify checksum (simulates AES-GCM authentication)
    const expectedChecksum = calculateChecksum(plaintext);
    if (storedChecksum !== expectedChecksum) {
      throw new DOMException(
        'The operation failed for an operation-specific reason',
        'OperationError',
      );
    }

    return plaintext.buffer;
  });

  return () => {
    // Restore original methods
    crypto.subtle.importKey = originalImportKey;
    crypto.subtle.deriveKey = originalDeriveKey;
    crypto.subtle.encrypt = originalEncrypt;
    crypto.subtle.decrypt = originalDecrypt;
    encryptedData.clear();
  };
}
