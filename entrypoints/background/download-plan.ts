/**
 * Download plan builder with evaluation and path resolution
 */
import type { SensitiveDetectionResult } from '@/entrypoints/shared/classification/sensitive-content';
import { detectSensitiveContent } from '@/entrypoints/shared/classification/sensitive-content';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type { DebugContext } from '@/entrypoints/shared/debug/types';
import { getManagedRelativePath } from '@/entrypoints/shared/filesystem/handle-storage';
import {
  buildManagedPath,
  normalizeDownloadPath,
  normalizeManagedPrefix,
} from '@/entrypoints/shared/filesystem/path-helpers';
import type { MediaDebugSettings } from '@/entrypoints/shared/integrations/mediainfo/debug';
import {
  evaluateInstantBaseline,
  evaluateInstantBaselineDebug,
  type InstantBaselineComputation,
} from '@/entrypoints/shared/pipeline/instant-baseline-strategy';
import type { InstantBaselineEvaluation } from '@/entrypoints/shared/pipeline/instant-baseline-types';
import type { ConfirmToastRoute } from '@/entrypoints/shared/settings/confirm-toast-routing';
import { resolveConfirmToastRoute } from '@/entrypoints/shared/settings/confirm-toast-routing';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import type { PageContextService } from '@/entrypoints/shared/state/page-context-service';
import { fallbackNameFromUrl } from '@/entrypoints/shared/utils/filename';
import { randomId } from '@/entrypoints/shared/utils/id';
import type { DeterminingItem } from './download-types';
import { shouldRenameType } from './download-utils';
import { toMediaDebugSettings } from './media-orchestrator';

export interface DownloadPlan {
  historyId: string;
  settings: Settings;
  url: string;
  filename: string;
  rawDownloadId?: number;
  downloadId?: string;
  initiatingTabId?: number;
  evaluation: InstantBaselineEvaluation;
  typeEnabled: boolean;
  renameCandidate: InstantBaselineEvaluation['rename'] | undefined;
  managedPrefix: string | null;
  originalRelativePath: string;
  renameRelativePath: string;
  suggestionOriginalPath: string | null;
  suggestionRenamePath: string;
  sensitiveDetection: SensitiveDetectionResult;
  confirmRoute: ConfirmToastRoute;
  debugContext: DebugContext | null;
  debugSettings: MediaDebugSettings | undefined;
  /** Page context captured at download time (title, heading, URL) */
  pageContext: ReturnType<PageContextService['read']> extends Promise<infer T>
    ? T
    : never;
}

interface BuildPlanParams {
  item: DeterminingItem;
  pageContextService: PageContextService;
  readSettings: () => Settings;
}

function getNumericProperty(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

export async function buildDownloadPlan({
  item,
  pageContextService,
  readSettings,
}: BuildPlanParams): Promise<DownloadPlan> {
  const settings = readSettings();
  const url = item.finalUrl ?? item.url;
  const filename = item.filename ?? fallbackNameFromUrl(url);
  const rawDownloadId = getNumericProperty((item as { id?: unknown }).id);
  const downloadId =
    rawDownloadId !== undefined ? String(rawDownloadId) : undefined;
  const initiatingTabId = getNumericProperty(
    (item as { tabId?: unknown }).tabId,
  );

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
    const debugDownloadId = debugLogger.createDownloadId();
    debugContext = evaluateInstantBaselineDebug(
      signals,
      settings,
      debugDownloadId,
    );
    debugLogger.startContext(debugDownloadId, debugContext);
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

  const managedPrefixRaw = await getManagedRelativePath();
  const managedPrefix = normalizeManagedPrefix(managedPrefixRaw);

  const originalRelativePath = normalizeDownloadPath(
    evaluation.originalPath && evaluation.originalPath.length > 0
      ? evaluation.originalPath
      : filename,
  );

  const renameRelativePath = renameCandidate
    ? normalizeDownloadPath(renameCandidate.path)
    : originalRelativePath;

  const suggestionOriginalPath =
    managedPrefix !== null
      ? buildManagedPath(managedPrefix, originalRelativePath)
      : null;

  const suggestionRenamePath =
    managedPrefix !== null
      ? buildManagedPath(managedPrefix, renameRelativePath)
      : renameRelativePath;

  const sensitiveDetection = detectSensitiveContent({
    originalPath: evaluation.originalPath,
    proposedPath: renameCandidate?.path,
    url,
    reasonTags: evaluation.reasonTags,
  });

  const confirmRoute = resolveConfirmToastRoute({
    settings,
    fileType: evaluation.fileType,
    signals: {
      sensitiveReasons: sensitiveDetection.reasons,
    },
  });

  const debugSettings = toMediaDebugSettings(settings);

  return {
    historyId: randomId(),
    settings,
    url,
    filename,
    rawDownloadId,
    downloadId,
    initiatingTabId,
    evaluation,
    typeEnabled,
    renameCandidate,
    managedPrefix,
    originalRelativePath,
    renameRelativePath,
    suggestionOriginalPath,
    suggestionRenamePath,
    sensitiveDetection,
    confirmRoute,
    debugContext,
    debugSettings,
    pageContext,
  };
}
