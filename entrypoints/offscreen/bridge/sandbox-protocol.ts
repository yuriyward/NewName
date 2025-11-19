/**
 * Type-safe protocol definitions for Offscreen ↔ Sandbox (iframe) communication.
 * Uses window.postMessage for parent-iframe IPC (browser standard).
 */

import { offscreenLogger } from '@/entrypoints/shared/debug/offscreen-logger';
import type { MediaDebugSettings } from '@/entrypoints/shared/integrations/mediainfo/debug';
import type { MediaAnalysisResponse } from '@/entrypoints/shared/integrations/mediainfo/messages';

/**
 * Messages sent from Parent (Offscreen) → Sandbox (iframe)
 */
export interface ParentToSandboxMessages {
  ping: {
    requestId: string;
  };
  init: {
    requestId: string;
    debug?: MediaDebugSettings;
  };
  'analyze-blob': {
    requestId: string;
    arrayBuffer: ArrayBuffer;
    debug?: MediaDebugSettings;
  };
  'analyze-url-streaming': {
    requestId: string;
    url: string;
    chunkSize?: number;
    historyId?: string;
    downloadId?: string;
    debug?: MediaDebugSettings;
  };
}

/**
 * Messages sent from Sandbox (iframe) → Parent (Offscreen)
 */
export interface SandboxToParentMessages {
  ready: {
    timestamp: number;
  };
  pong: {
    requestId: string;
    timestamp: number;
  };
  'init-complete': {
    requestId: string;
    success: boolean;
    error?: string;
  };
  result: {
    requestId: string;
    data: MediaAnalysisResponse;
  };
  'init-stream': {
    requestId: string;
    url: string;
  };
  'fetch-chunk': {
    requestId: string;
    baseRequestId: string;
    offset: number;
    size: number;
  };
  'cleanup-stream': {
    requestId: string;
  };
}

/**
 * Messages sent from Parent (Offscreen) → Sandbox in response to stream requests
 */
export interface ParentStreamResponses {
  'stream-ready': {
    requestId: string;
    data: {
      success: boolean;
      totalSize?: number;
    };
  };
  'stream-error': {
    requestId: string;
    data: {
      error: string;
    };
  };
  'chunk-result': {
    requestId: string;
    data: {
      bytes: Uint8Array;
      offset: number;
      size: number;
    };
  };
  'chunk-error': {
    requestId: string;
    data: {
      error: string;
    };
  };
}

/**
 * Combined message protocol for all sandbox communication
 */
export type SandboxMessageProtocol = ParentToSandboxMessages &
  SandboxToParentMessages &
  ParentStreamResponses;

/**
 * Message event structure for typed message handling
 */
export interface TypedSandboxMessage<T extends keyof SandboxMessageProtocol> {
  type: T;
  requestId?: string;
  data?: SandboxMessageProtocol[T];
}

/**
 * Send a typed message from parent (Offscreen) to sandbox (iframe).
 */
export function postToSandbox<T extends keyof ParentToSandboxMessages>(
  sandboxWindow: WindowProxy | null,
  type: T,
  data: ParentToSandboxMessages[T],
): void {
  if (!sandboxWindow) {
    offscreenLogger.warn(
      '[SandboxProtocol] Cannot post message - no sandbox window',
    );
    return;
  }
  sandboxWindow.postMessage({ type, ...data }, '*');
}

/**
 * Send a typed message from parent (Offscreen) to sandbox with transferables.
 */
export function postToSandboxWithTransfer<
  T extends keyof ParentStreamResponses,
>(
  sandboxWindow: WindowProxy | null,
  type: T,
  message: ParentStreamResponses[T] & { requestId: string },
  transfer?: Transferable[],
): void {
  if (!sandboxWindow) {
    offscreenLogger.warn(
      '[SandboxProtocol] Cannot post message - no sandbox window',
    );
    return;
  }
  sandboxWindow.postMessage({ type, ...message }, '*', transfer);
}

/**
 * Send a typed message from sandbox (iframe) to parent (Offscreen).
 */
export function postToParent<T extends keyof SandboxToParentMessages>(
  type: T,
  data: SandboxToParentMessages[T],
): void {
  window.parent.postMessage({ type, ...data }, '*');
}

/**
 * Type guard to check if a message event is from the expected source.
 */
export function isSandboxMessage(
  event: MessageEvent,
  expectedType?: keyof SandboxMessageProtocol,
): boolean {
  if (!event.data || typeof event.data !== 'object') {
    return false;
  }
  if (expectedType && event.data.type !== expectedType) {
    return false;
  }
  return true;
}
