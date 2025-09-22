import { browser } from 'wxt/browser';
import { addHistoryItem } from '@/entrypoints/shared/history/history';
import { registerInstallDateListener } from '@/entrypoints/shared/integrations/install-date';
import { computePhase1Outcome } from '@/entrypoints/shared/renaming/phase1';
import {
  getLastKnownSettings,
  getSettings,
  type SettingsV1,
  subscribeSettings,
} from '@/entrypoints/shared/settings/settings';
import type { ContentToBackgroundMessage } from '@/entrypoints/shared/signals/messages';
import {
  clearPageContext,
  getPageContext,
  pruneStaleContexts,
  updatePageContext,
} from '@/entrypoints/shared/signals/page-context-store';

function randomId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

function basename(path: string): string {
  const normalised = path.replace(/\\/g, '/');
  const parts = normalised.split('/');
  return parts.pop() ?? path;
}

function fallbackNameFromUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const segment = url.pathname.split('/').pop() ?? 'download';
    if (!segment) return 'download';
    try {
      const decoded = decodeURIComponent(segment);
      return decoded || 'download';
    } catch {
      return segment;
    }
  } catch {
    return 'download';
  }
}

function ensureSettingsCache() {
  let current: SettingsV1 = getLastKnownSettings();
  void getSettings().then((settings) => {
    current = settings;
  });
  subscribeSettings((settings) => {
    current = settings;
  });
  return () => current;
}

const readSettings = ensureSettingsCache();

const handleContentMessage: Parameters<
  typeof browser.runtime.onMessage.addListener
>[0] = (message, sender) => {
  if (!message || typeof message !== 'object') return;
  const typed = message as ContentToBackgroundMessage;
  const tabId = typeof sender.tab?.id === 'number' ? sender.tab.id : null;
  if (tabId === null) return;

  if (typed.type === 'PAGE_CONTEXT') {
    updatePageContext(tabId, {
      title: typed.payload.title,
      heading: typed.payload.heading,
    });
    return;
  }

  if (typed.type === 'LINK_CONTEXT') {
    updatePageContext(tabId, {
      linkText: typed.payload.linkText,
      linkRel: typed.payload.linkRel ?? undefined,
    });
  }
};

function shouldRenameType(
  settings: SettingsV1,
  fileType: keyof SettingsV1['perType'],
): boolean {
  const behavior = settings.perType[fileType]?.behavior ?? 'auto';
  if (behavior === 'off') return false;
  return true;
}

const handleDeterminingFilename: Parameters<
  typeof browser.downloads.onDeterminingFilename.addListener
>[0] = (item, suggest) => {
  (async () => {
    let suggestionIssued = false;
    try {
      pruneStaleContexts();

      const settings = readSettings();
      const url = item.finalUrl ?? item.url;
      const filename = item.filename ?? fallbackNameFromUrl(url);
      const initiatingTabId =
        typeof (item as { tabId?: number }).tabId === 'number'
          ? (item as { tabId?: number }).tabId
          : undefined;
      const pageContext = getPageContext(initiatingTabId);

      const outcome = computePhase1Outcome(
        {
          url,
          referrer: item.referrer,
          filename,
          mime: item.mime,
          startTime: item.startTime,
          page: pageContext,
        },
        settings,
      );

      if (shouldRenameType(settings, outcome.fileType)) {
        suggest({ filename: outcome.path });
        suggestionIssued = true;
      } else {
        suggest();
        suggestionIssued = true;
        return;
      }

      await addHistoryItem({
        id: randomId(),
        ts: Date.now(),
        path: outcome.path,
        original: basename(filename),
        final: outcome.filename,
        source: outcome.source,
        fileType: outcome.fileType,
        phase: 1,
        reasonTags: outcome.reasonTags,
      });
    } catch (error) {
      console.error('Phase-1 rename failed', error);
      if (!suggestionIssued) {
        try {
          suggest();
        } catch {
          // Suggestion may have already been sent; ignore secondary errors.
        }
      }
    }
  })();
};

export default defineBackground(() => {
  registerInstallDateListener();

  browser.runtime.onMessage.addListener(handleContentMessage);
  browser.tabs.onRemoved.addListener((tabId) => {
    clearPageContext(tabId);
  });
  browser.downloads.onDeterminingFilename.addListener(
    handleDeterminingFilename,
  );

  setInterval(() => {
    pruneStaleContexts();
  }, 60_000);

  console.log('NewName background ready', { id: browser.runtime.id });
});
