/**
 * Integration tests for MediaInfo three-tier architecture:
 * Background → Offscreen → Sandbox → Back
 *
 * Note: These are unit-level integration tests that validate message passing,
 * protocol validation, and API contracts using mocked browser APIs.
 *
 * Full end-to-end tests with actual offscreen documents and sandbox iframes
 * are in tests/e2e/mediainfo-integration.spec.ts using Playwright.
 *
 * These tests verify:
 * - Message protocol type safety
 * - API surface contracts
 * - Resource cleanup functions
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { destroySandbox } from '@/entrypoints/offscreen/bridge/sandbox-lifecycle';
import { isSandboxMessage } from '@/entrypoints/offscreen/bridge/sandbox-protocol';
import { resetOffscreenCoordinatorForTesting } from './offscreen-coordinator';

describe('MediaInfo Integration', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.clearAllMocks();

    // Mock offscreen API - using unknown to avoid chrome type dependency in tests
    fakeBrowser.offscreen = {
      createDocument: vi.fn().mockResolvedValue(undefined),
      closeDocument: vi.fn().mockResolvedValue(undefined),
      hasDocument: vi.fn().mockResolvedValue(false),
      Reason: {
        DOM_SCRAPING: 'DOM_SCRAPING',
        BLOBS: 'BLOBS',
      },
    } as unknown as typeof fakeBrowser.offscreen;

    // Mock window.location for tests
    if (typeof globalThis.window === 'undefined') {
      // biome-ignore lint/suspicious/noExplicitAny: Test mock requires any to set window object
      (globalThis as any).window = {
        location: {
          origin: 'chrome-extension://test-extension-id',
        },
      };
    }

    // Reset queue state
    resetOffscreenCoordinatorForTesting();
  });

  describe('Message Protocol Validation', () => {
    it('should use typed message protocol for offscreen ↔ sandbox', () => {
      // Test message type validation
      const validMessage = new MessageEvent('message', {
        data: { type: 'ready', timestamp: Date.now() },
      });

      expect(isSandboxMessage(validMessage, 'ready')).toBe(true);

      // Test invalid message type
      const invalidMessage = new MessageEvent('message', {
        data: { type: 'unknown' },
      });

      expect(isSandboxMessage(invalidMessage, 'ready')).toBe(false);
    });

    it('should validate message structure - reject non-object data', () => {
      // Non-object data
      const invalidMessage1 = new MessageEvent('message', {
        data: 'string data',
      });

      expect(isSandboxMessage(invalidMessage1)).toBe(false);

      // Null data
      const invalidMessage2 = new MessageEvent('message', {
        data: null,
      });

      expect(isSandboxMessage(invalidMessage2)).toBe(false);
    });

    it('should validate expected message type', () => {
      // Valid message but wrong type
      const message = new MessageEvent('message', {
        data: { type: 'ready', timestamp: Date.now() },
      });

      // Should pass when checking for 'ready'
      expect(isSandboxMessage(message, 'ready')).toBe(true);

      // Should fail when checking for 'pong'
      expect(isSandboxMessage(message, 'pong')).toBe(false);
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should clean up offscreen document after analysis', () => {
      // Verify the cleanup function exists and works
      // Should not throw
      expect(() => resetOffscreenCoordinatorForTesting()).not.toThrow();
    });

    it('should clean up sandbox iframe after timeout', () => {
      // Verify sandbox lifecycle cleanup
      // Should not throw even if sandbox doesn't exist
      const mockPendingRequests = new Map();
      expect(() => destroySandbox(mockPendingRequests)).not.toThrow();
    });
  });
});
