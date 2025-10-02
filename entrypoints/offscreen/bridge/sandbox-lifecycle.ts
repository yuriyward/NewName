/**
 * Sandbox iframe lifecycle management
 */
import { browser } from 'wxt/browser';
import { SANDBOX_READY_TIMEOUT_MS } from '@/entrypoints/shared/integrations/mediainfo/constants';
import { isSandboxMessage, postToSandbox } from './sandbox-protocol';

let iframe: HTMLIFrameElement | null = null;
let readyPromise: Promise<void> | null = null;

/**
 * Resolve the sandbox URL using the browser runtime API.
 */
function resolveSandboxUrl(): string {
  if (browser.runtime?.getURL) {
    return browser.runtime.getURL('/sandbox.html');
  }
  const extensionRoot = browser.runtime.getURL('/');
  return new URL('/sandbox.html', extensionRoot).toString();
}

/**
 * Create the sandboxed iframe element.
 */
function createIframe(): HTMLIFrameElement {
  const frame = document.createElement('iframe');
  frame.src = resolveSandboxUrl();
  frame.style.display = 'none';
  frame.sandbox.add('allow-scripts');
  document.body.appendChild(frame);
  console.log('[SandboxBridge] Created iframe', { src: frame.src });
  return frame;
}

/**
 * Wait for the sandbox to send a 'ready' signal.
 */
function waitForReady(): Promise<void> {
  if (readyPromise) return readyPromise;

  readyPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Sandbox ready timeout after 5s'));
    }, SANDBOX_READY_TIMEOUT_MS);

    const handler = (event: MessageEvent) => {
      if (isSandboxMessage(event, 'ready')) {
        console.log('[SandboxBridge] Received ready signal from sandbox');
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        cleanup();
        resolve();
      }
    };

    function cleanup() {
      window.removeEventListener('message', handler);
    }

    window.addEventListener('message', handler);
  });

  return readyPromise;
}

/**
 * Ensure the sandbox iframe is ready and initialized.
 */
export async function ensureSandboxReady(): Promise<void> {
  if (!iframe) {
    console.log('[SandboxBridge] Creating sandboxed iframe');
    iframe = createIframe();
  }

  await waitForReady();

  // Send init message to pre-initialize MediaInfo
  console.log('[SandboxBridge] Sending init to sandbox');
  const initId = `init_${Date.now()}`;

  const initResult = await new Promise<{ success: boolean; error?: string }>(
    (resolve, reject) => {
      const timeout = setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(new Error('Sandbox init timeout'));
      }, SANDBOX_READY_TIMEOUT_MS);

      const handler = (event: MessageEvent) => {
        if (
          isSandboxMessage(event, 'init-complete') &&
          event.data.requestId === initId
        ) {
          clearTimeout(timeout);
          window.removeEventListener('message', handler);
          resolve({
            success: event.data.success,
            error: event.data.error,
          });
        }
      };

      window.addEventListener('message', handler);
      postToSandbox(iframe?.contentWindow ?? null, 'init', {
        requestId: initId,
      });
    },
  );

  if (!initResult.success) {
    throw new Error(`Sandbox initialization failed: ${initResult.error}`);
  }

  console.log('[SandboxBridge] Sandbox fully initialized');
}

/**
 * Get the iframe content window for posting messages.
 */
export function getSandboxWindow(): WindowProxy | null {
  return iframe?.contentWindow ?? null;
}

/**
 * Check if a message event is from the sandbox iframe.
 */
export function isFromSandbox(event: MessageEvent): boolean {
  return event.source === iframe?.contentWindow;
}

/**
 * Destroy the sandbox iframe and cleanup resources.
 */
export function destroySandbox(
  pendingRequests: Map<
    string,
    { reject: (error: Error) => void; timeout: ReturnType<typeof setTimeout> }
  >,
): void {
  if (iframe) {
    console.log('[SandboxBridge] Destroying sandbox iframe');
    iframe.remove();
    iframe = null;
    readyPromise = null;

    // Reject all pending requests
    for (const [_requestId, pending] of pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Sandbox destroyed'));
    }
    pendingRequests.clear();
  }
}
