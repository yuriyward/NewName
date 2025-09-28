/**
 * Background service worker for download interception and renaming
 */
import { browser } from 'wxt/browser';
import { initializeBackgroundDebug } from '@/entrypoints/shared/debug/console-helpers';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type { DebugContext } from '@/entrypoints/shared/debug/types';
import { addHistoryItem } from '@/entrypoints/shared/history/history';
import { registerInstallDateListener } from '@/entrypoints/shared/lifecycle/install-tracking';
import { onExtensionMessage } from '@/entrypoints/shared/messaging/extension-messaging';
import {
  evaluateInstantBaseline,
  evaluateInstantBaselineDebug,
  type InstantBaselineComputation,
} from '@/entrypoints/shared/pipeline/instant-baseline-strategy';
import type { InstantBaselineEvaluation } from '@/entrypoints/shared/pipeline/instant-baseline-types';
import {
  getLastKnownSettings,
  getSettings,
  type SettingsV1,
  subscribeSettings,
} from '@/entrypoints/shared/settings/settings';
import {
  type PageContextService,
  registerPageContextService,
} from '@/entrypoints/shared/state/page-context-service';

const randomId = (() => {
  let fallbackRandomSeed = 0;

  return function randomId(): string {
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
  };
})();

function basename(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/');
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

  // Initialize debug logger with current settings
  debugLogger.setEnabled(current.debug.enabled);
  debugLogger.setLevel(current.debug.level);

  void getSettings().then((settings) => {
    current = settings;
    debugLogger.setEnabled(settings.debug.enabled);
    debugLogger.setLevel(settings.debug.level);
  });
  subscribeSettings((settings) => {
    current = settings;
    debugLogger.setEnabled(settings.debug.enabled);
    debugLogger.setLevel(settings.debug.level);
  });
  return () => current;
}

const readSettings = ensureSettingsCache();

const SUGGEST_TIMEOUT_MS = 400;
const PAGE_CONTEXT_PRUNE_INTERVAL_MS = 5 * 60_000;

type DeterminingListener = Parameters<
  typeof browser.downloads.onDeterminingFilename.addListener
>[0];

type DeterminingItem = Parameters<DeterminingListener>[0];
type SuggestCallback = Parameters<DeterminingListener>[1];
type SuggestPayload = Parameters<SuggestCallback>[0];

function createSuggestController(suggest: SuggestCallback) {
  let resolved = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
    if (resolved) return;
    resolved = true;
    try {
      suggest();
    } catch (error) {
      console.warn('Suggest callback failed after timeout', error);
    }
  }, SUGGEST_TIMEOUT_MS);

  function clearTimer() {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  }

  return {
    trySuggest(payload?: SuggestPayload): boolean {
      if (resolved) return false;
      try {
        if (payload) {
          suggest(payload);
        } else {
          suggest();
        }
        resolved = true;
        clearTimer();
        return true;
      } catch (error) {
        resolved = true;
        clearTimer();
        throw error;
      }
    },
    ensureDefault(): void {
      if (resolved) return;
      try {
        suggest();
      } catch (error) {
        console.warn('Suggest callback failed during fallback', error);
      } finally {
        resolved = true;
        clearTimer();
      }
    },
    finish(): void {
      if (resolved) return;
      resolved = true;
      clearTimer();
    },
  };
}

function shouldRenameType(
  settings: SettingsV1,
  fileType: keyof SettingsV1['perType'],
): boolean {
  const behavior = settings.perType[fileType]?.behavior ?? 'auto';
  if (behavior === 'off') return false;
  return true;
}

async function processDeterminingFilename(
  item: DeterminingItem,
  suggest: SuggestCallback,
  pageContextService: PageContextService,
): Promise<void> {
  const controller = createSuggestController(suggest);
  let suggestionIssued = false;
  try {
    await pageContextService.prune();

    const settings = readSettings();
    const url = item.finalUrl ?? item.url;
    const filename = item.filename ?? fallbackNameFromUrl(url);
    const initiatingTabId =
      typeof (item as { tabId?: number }).tabId === 'number'
        ? (item as { tabId?: number }).tabId
        : undefined;
    const pageContext = await pageContextService.read({
      tabId: initiatingTabId,
      url: item.referrer,
    });

    const signals = {
      url,
      referrer: item.referrer,
      filename,
      mime: item.mime,
      startTime: item.startTime,
      page: pageContext,
    };

    let computation: InstantBaselineComputation;
    let debugContext: DebugContext | null = null;

    if (debugLogger.isEnabled()) {
      const downloadId = debugLogger.createDownloadId();
      debugContext = evaluateInstantBaselineDebug(
        signals,
        settings,
        downloadId,
      );
      debugLogger.startContext(downloadId, debugContext);
      computation = {
        evaluation: debugContext.evaluation,
        inputs: debugContext.strategy.inputs,
      };
    } else {
      computation = evaluateInstantBaseline(signals, settings);
    }

    const evaluation: InstantBaselineEvaluation = computation.evaluation;
    const typeEnabled = shouldRenameType(settings, evaluation.fileType);
    const renameCandidate = typeEnabled ? evaluation.rename : undefined;

    if (renameCandidate) {
      const submitted = controller.trySuggest({
        filename: renameCandidate.path,
      });
      if (!submitted) {
        return;
      }
      suggestionIssued = true;
    } else {
      const submitted = controller.trySuggest();
      if (!submitted) {
        return;
      }
      suggestionIssued = true;
      return;
    }

    const historyDecision: InstantBaselineEvaluation['decision'] =
      renameCandidate
        ? evaluation.decision
        : {
            ...evaluation.decision,
            outcome: 'keep',
            reasons:
              evaluation.decision.outcome === 'rename' && !typeEnabled
                ? [...evaluation.decision.reasons, 'file-type-disabled']
                : evaluation.decision.reasons,
          };

    await addHistoryItem({
      id: randomId(),
      ts: Date.now(),
      path: renameCandidate ? renameCandidate.path : evaluation.originalPath,
      original: basename(filename),
      final: renameCandidate ? renameCandidate.filename : basename(filename),
      source: renameCandidate ? renameCandidate.source : evaluation.source,
      fileType: evaluation.fileType,
      phase: 'instant-baseline',
      reasonTags: evaluation.reasonTags,
      decision: historyDecision,
    });

    if (debugContext) {
      debugLogger.finishContext(debugContext.downloadId, {
        evaluation: renameCandidate
          ? evaluation
          : {
              ...evaluation,
              decision: historyDecision,
            },
      });
    }
  } catch (error) {
    console.error('Instant Baseline rename failed', error);
    if (!suggestionIssued) {
      controller.ensureDefault();
    }
  } finally {
    controller.finish();
  }
}

function createDeterminingListener(
  pageContextService: PageContextService,
): DeterminingListener {
  return (item, suggest) => {
    void processDeterminingFilename(item, suggest, pageContextService).catch(
      (error) => {
        console.error('Instant Baseline rename unhandled failure', error);
      },
    );
    // Returning true keeps the determining callback alive for async suggest() calls.
    return true;
  };
}

function initializeBackground(): void {
  registerInstallDateListener();
  initializeBackgroundDebug();

  const pageContextService = registerPageContextService();

  onExtensionMessage('resolveRuntimeContext', ({ sender }) => ({
    tabId: sender.tab?.id ?? undefined,
    frameId: sender.frameId,
    url: sender.url ?? sender.tab?.url ?? null,
  }));

  browser.tabs.onRemoved.addListener((tabId) => {
    void pageContextService.clear(tabId);
  });
  browser.downloads.onDeterminingFilename.addListener(
    createDeterminingListener(pageContextService),
  );

  setInterval(() => {
    void pageContextService.prune();
  }, PAGE_CONTEXT_PRUNE_INTERVAL_MS);

  const settings = readSettings();
  if (settings.debug.enabled) {
    console.log('[NewName Debug] Background ready', { id: browser.runtime.id });
  }
}

export default defineBackground(() => {
  initializeBackground();
});
