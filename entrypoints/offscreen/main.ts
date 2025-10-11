/**
 * Offscreen document initialization with media analysis handlers
 */
import { attachConsoleHelpers } from '@/entrypoints/shared/debug/console-helpers';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { sendExtensionMessage } from '@/entrypoints/shared/messaging/extension-messaging';
import { initializeMediaAnalysisHandler } from './media-analysis-handler';

// Wrap in IIFE to ensure immediate execution
(async () => {
  console.log('[Offscreen] Script starting execution', {
    readyState: document.readyState,
    timestamp: Date.now(),
  });

  attachConsoleHelpers();

  // Initialize handlers first
  initializeMediaAnalysisHandler();

  console.log('[Offscreen] Handlers initialized', {
    timestamp: Date.now(),
  });

  // Wait for document to be fully ready
  if (document.readyState === 'loading') {
    await new Promise((resolve) => {
      document.addEventListener('DOMContentLoaded', resolve, { once: true });
    });
  }

  // Additional small delay to ensure message system is ready
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Announce readiness to background after listeners are registered
  try {
    console.log('[Offscreen] Sending ready signal', {
      timestamp: Date.now(),
    });
    await sendExtensionMessage('offscreenReady', { ts: Date.now() });
    console.log('[Offscreen] Ready signal sent successfully');
  } catch (error) {
    debugLogger.error('[Offscreen] Failed to send ready signal', { error });
    // best-effort; background will still handshake-retry
  }

  console.log('[Offscreen] Initialization complete', {
    timestamp: Date.now(),
  });
})().catch((error) => {
  debugLogger.error('[Offscreen] Fatal initialization error', { error });
});
