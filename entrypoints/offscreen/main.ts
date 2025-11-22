/**
 * Offscreen document initialization with media analysis handlers
 */
import { attachConsoleHelpers } from '@/entrypoints/shared/debug/console-helpers';
import { offscreenLogger } from '@/entrypoints/shared/debug/offscreen-logger';
import { OFFSCREEN_INIT_DELAY_MS } from '@/entrypoints/shared/integrations/mediainfo/constants';
import { sendExtensionMessage } from '@/entrypoints/shared/messaging/extension-messaging';
import { initializeImageAnalysisHandler } from './image-analysis-handler';
import { initializeMediaAnalysisHandler } from './media-analysis-handler';
import { initializePdfAnalysisHandler } from './pdf-analysis-handler';
import { initializeTextAnalysisHandler } from './text-analysis-handler';

// Wrap in IIFE to ensure immediate execution
(async () => {
  offscreenLogger.log('[Offscreen] Script starting execution', {
    readyState: document.readyState,
    timestamp: Date.now(),
  });

  attachConsoleHelpers();

  // Initialize handlers first
  try {
    initializeImageAnalysisHandler();
  } catch (error) {
    offscreenLogger.error(
      '[Offscreen] Failed to initialize image handler',
      error,
    );
  }

  try {
    initializeMediaAnalysisHandler();
  } catch (error) {
    offscreenLogger.error(
      '[Offscreen] Failed to initialize media handler',
      error,
    );
  }

  try {
    initializePdfAnalysisHandler();
  } catch (error) {
    offscreenLogger.error(
      '[Offscreen] Failed to initialize PDF handler',
      error,
    );
  }

  try {
    initializeTextAnalysisHandler();
  } catch (error) {
    offscreenLogger.error(
      '[Offscreen] Failed to initialize text handler',
      error,
    );
  }

  // Wait for document to be fully ready
  if (document.readyState === 'loading') {
    await new Promise((resolve) => {
      document.addEventListener('DOMContentLoaded', resolve, { once: true });
    });
  }

  // Additional delay to ensure message system and dynamic import infrastructure is ready
  await new Promise((resolve) => setTimeout(resolve, OFFSCREEN_INIT_DELAY_MS));

  // Announce readiness to background after listeners are registered
  try {
    await sendExtensionMessage('offscreenReady', { ts: Date.now() });
  } catch (error) {
    offscreenLogger.error('[Offscreen] Failed to send ready signal', { error });
    // best-effort; background will still handshake-retry
  }
})().catch((error) => {
  offscreenLogger.error('[Offscreen] Fatal initialization error', { error });
});
