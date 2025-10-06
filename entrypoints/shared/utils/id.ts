/**
 * Utility helpers for generating identifiers.
 */
let fallbackRandomSeed = 0;

/**
 * Generate a random ID for tracking downloads and history items.
 * Falls back to Math.random when crypto APIs are unavailable.
 */
export function randomId(): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    if (typeof crypto.getRandomValues === 'function') {
      const buffer = new Uint32Array(4);
      crypto.getRandomValues(buffer);
      return Array.from(buffer, (value) =>
        value.toString(16).padStart(8, '0'),
      ).join('');
    }
  }

  fallbackRandomSeed = (fallbackRandomSeed + 1) & 0xffff;
  const timeHex = Date.now().toString(16);
  const seedHex = fallbackRandomSeed.toString(16).padStart(4, '0');
  const randomHex = Math.random().toString(16).slice(2, 10);
  return `${timeHex}-${seedHex}-${randomHex}`;
}
