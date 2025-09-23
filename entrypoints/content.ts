/**
 * Content script for page context extraction and messaging
 */
import { browser } from 'wxt/browser';
import type { ContentToBackgroundMessage } from '@/entrypoints/shared/messaging/content-messages';

const MAX_IMMEDIATE_SEND_ATTEMPTS = 3;
const MAX_TOTAL_SEND_ATTEMPTS = 6;
const RETRY_BASE_DELAY_MS = 75;
const QUEUED_RETRY_DELAY_MS = 1_000;

interface PendingMessage {
  message: ContentToBackgroundMessage;
  attempts: number;
}

let pendingMessages: PendingMessage[] = [];
let pendingFlushTimer: ReturnType<typeof setTimeout> | undefined;

function schedulePendingFlush(): void {
  if (pendingFlushTimer !== undefined) return;
  pendingFlushTimer = setTimeout(() => {
    pendingFlushTimer = undefined;
    flushPendingMessages();
  }, QUEUED_RETRY_DELAY_MS);
}

function flushPendingMessages(): void {
  if (pendingMessages.length === 0) return;
  const queue = pendingMessages;
  pendingMessages = [];
  for (const entry of queue) {
    sendMessageWithRetry(entry.message, entry.attempts);
  }
}

function firstHeading(): string | undefined {
  const root = document.body ?? document.documentElement;
  if (!root) return undefined;

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT,
    (node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return NodeFilter.FILTER_SKIP;
      }
      const element = node as HTMLElement;
      const tagName = element.tagName;
      if (tagName !== 'H1' && tagName !== 'H2') {
        return NodeFilter.FILTER_SKIP;
      }
      const text = element.textContent?.trim();
      if (!text || text.length <= 4) {
        return NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  );

  const heading = walker.nextNode();
  if (!(heading instanceof HTMLElement)) {
    return undefined;
  }

  const text = heading.textContent?.trim();
  return text ? truncate(text) : undefined;
}

function truncate(
  value: string | null | undefined,
  max = 160,
): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function sendMessageWithRetry(
  message: ContentToBackgroundMessage,
  attempts = 0,
): void {
  const nextAttempt = attempts + 1;
  void browser.runtime.sendMessage(message).catch((error) => {
    if (nextAttempt >= MAX_TOTAL_SEND_ATTEMPTS) {
      console.warn('Dropping message after repeated failures', {
        message,
        error,
      });
      return;
    }

    if (nextAttempt < MAX_IMMEDIATE_SEND_ATTEMPTS) {
      const delay = RETRY_BASE_DELAY_MS * 2 ** (nextAttempt - 1);
      setTimeout(() => {
        sendMessageWithRetry(message, nextAttempt);
      }, delay);
      return;
    }

    pendingMessages.push({ message, attempts: nextAttempt });
    schedulePendingFlush();
  });
}

function sendMessage(message: ContentToBackgroundMessage): void {
  flushPendingMessages();
  sendMessageWithRetry(message);
}

interface PageContextSnapshot {
  title?: string;
  heading?: string;
}

let lastPublishedContext: PageContextSnapshot = {
  title: undefined,
  heading: undefined,
};

function publishPageContext(force = false): void {
  const snapshot: PageContextSnapshot = {
    title: truncate(document.title),
    heading: firstHeading(),
  };

  if (
    !force &&
    snapshot.title === lastPublishedContext.title &&
    snapshot.heading === lastPublishedContext.heading
  ) {
    return;
  }

  lastPublishedContext = { ...snapshot };

  sendMessage({
    type: 'PAGE_CONTEXT',
    payload: snapshot,
  });
}

function handleLinkInteraction(event: Event): void {
  if (!(event.target instanceof Element)) return;
  const anchor = event.target.closest('a');
  if (!anchor) return;
  const linkText = truncate(anchor.textContent);
  const rel = anchor.getAttribute('rel');
  sendMessage({
    type: 'LINK_CONTEXT',
    payload: {
      linkText,
      linkRel: rel,
    },
  });
}

function observeTitle(): void {
  const titleElement = document.head?.querySelector('title');
  if (!titleElement) return;
  const observer = new MutationObserver(() => {
    const nextTitle = truncate(document.title);
    if (nextTitle === lastPublishedContext.title) {
      return;
    }
    publishPageContext();
  });
  observer.observe(titleElement, {
    characterData: true,
    childList: true,
    subtree: true,
  });
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    publishPageContext(true);
    observeTitle();
    window.addEventListener('click', handleLinkInteraction, true);
    window.addEventListener('auxclick', handleLinkInteraction, true);
    window.addEventListener('contextmenu', handleLinkInteraction, true);
  },
});
