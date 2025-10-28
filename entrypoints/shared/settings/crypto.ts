/**
 * Cryptographic utilities for secure API key storage
 *
 * Security Model:
 * - Uses Web Crypto API (AES-GCM) for encryption
 * - Derives encryption key from extension ID + salt using PBKDF2
 * - Provides obfuscation rather than true security (key is deterministic)
 * - Better than plaintext: requires extension context access + code analysis
 * - NOT secure against determined attackers with extension access
 *
 * Design Rationale:
 * Browser extensions lack a secure key storage mechanism without user interaction.
 * This implementation raises the security bar by:
 * 1. Preventing casual inspection of API keys in storage
 * 2. Requiring attackers to analyze extension code + have extension context
 * 3. Using standard crypto primitives (AES-GCM, PBKDF2)
 *
 * Limitations:
 * - Extension ID is public (in manifest)
 * - Salt is in source code (public in unpacked extension)
 * - Anyone with extension access can decrypt by running the same code
 * - This is obfuscation + access control, not cryptographic security
 *
 * Format:
 * - Encrypted data has format: "enc:v1:<base64>"
 * - This makes it unambiguous and prevents false positives with API keys that look like base64
 */

// Salt for key derivation (public, hardcoded)
// Changing this will invalidate all existing encrypted keys
const KEY_DERIVATION_SALT = 'file-renamer-api-key-v1';

// Prefix to identify encrypted data
// Version is in the prefix for future compatibility (currently v1)
const ENCRYPTION_PREFIX = 'enc:v1:';

// Encryption algorithm and parameters
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM
const PBKDF2_ITERATIONS = 100000; // OWASP recommended minimum

/**
 * Get the extension ID for key derivation
 * Falls back to a hardcoded value in test environments
 */
function getExtensionId(): string {
  // In WXT, browser.runtime.id is available
  if (typeof browser !== 'undefined' && browser?.runtime?.id) {
    return browser.runtime.id;
  }
  // Fallback for test environments
  return 'test-extension-id';
}

/**
 * Derive an encryption key from the extension ID and salt
 * Uses PBKDF2 to derive a key suitable for AES-GCM
 */
async function deriveEncryptionKey(): Promise<CryptoKey> {
  const extensionId = getExtensionId();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(extensionId + KEY_DERIVATION_SALT),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(KEY_DERIVATION_SALT),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt a plaintext API key
 *
 * @param plaintext - The API key to encrypt
 * @returns Prefixed base64-encoded encrypted data (format: "enc:v1:<base64>")
 */
export async function encryptApiKey(plaintext: string): Promise<string> {
  if (!plaintext || plaintext.length === 0) {
    throw new Error('Cannot encrypt empty API key');
  }

  const key = await deriveEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const plaintextBytes = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    plaintextBytes,
  );

  // Combine IV + ciphertext for storage
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Encode as base64 with version prefix for unambiguous identification
  const base64 = btoa(String.fromCharCode(...combined));
  return `${ENCRYPTION_PREFIX}${base64}`;
}

/**
 * Decrypt an encrypted API key
 *
 * @param encrypted - Prefixed base64-encoded encrypted data (format: "enc:v1:<base64>")
 * @returns The decrypted API key
 * @throws Error if decryption fails (wrong key, corrupted data, etc.)
 */
export async function decryptApiKey(encrypted: string): Promise<string> {
  if (!encrypted || encrypted.length === 0) {
    throw new Error('Cannot decrypt empty string');
  }

  if (!encrypted.startsWith(ENCRYPTION_PREFIX)) {
    throw new Error(
      'Invalid encrypted data format - missing encryption prefix',
    );
  }

  try {
    // Remove prefix and decode from base64
    const base64Data = encrypted.slice(ENCRYPTION_PREFIX.length);
    const combined = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Extract IV and ciphertext
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const key = await deriveEncryptionKey();
    const plaintextBytes = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext,
    );

    return new TextDecoder().decode(plaintextBytes);
  } catch (error) {
    // Decryption failure could mean:
    // - Data was corrupted
    // - Data was encrypted with a different key
    // - Wrong encryption version
    throw new Error(
      `Failed to decrypt API key: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
  }
}

/**
 * Check if a string is encrypted by looking for the encryption prefix
 * This is unambiguous and prevents false positives with API keys that look like base64
 *
 * @param value - String to check
 * @returns true if the string has the encryption prefix
 */
export function isEncrypted(value: string): boolean {
  return value?.startsWith(ENCRYPTION_PREFIX) ?? false;
}
