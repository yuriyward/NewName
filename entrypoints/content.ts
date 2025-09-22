import { browser } from 'wxt/browser';
import type { ContentToBackgroundMessage } from '@/entrypoints/shared/signals/messages';

function firstHeading(): string | undefined {
  const headings = document.querySelectorAll('h1, h2');
  for (const heading of headings) {
    const text = heading.textContent?.trim();
    if (text && text.length > 4) {
      return truncate(text);
    }
  }
  return undefined;
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

function sendMessage(message: ContentToBackgroundMessage): void {
  void browser.runtime.sendMessage(message).catch(() => {
    // Ignore delivery issues (e.g., background unavailable during reload)
  });
}

function publishPageContext(): void {
  sendMessage({
    type: 'PAGE_CONTEXT',
    payload: {
      title: truncate(document.title),
      heading: firstHeading(),
    },
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
  const titleElement = document.querySelector('title');
  if (!titleElement) return;
  const observer = new MutationObserver(() => {
    publishPageContext();
  });
  observer.observe(titleElement, { childList: true, subtree: true });
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    publishPageContext();
    observeTitle();
    window.addEventListener('click', handleLinkInteraction, true);
    window.addEventListener('auxclick', handleLinkInteraction, true);
    window.addEventListener('contextmenu', handleLinkInteraction, true);
  },
});
