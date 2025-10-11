/**
 * Mock AI-powered contextual upgrade proposal generator
 */
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type { UpgradeProposal } from '@/entrypoints/shared/history/types';
import {
  type BuiltInAiAdapter,
  createMockBuiltInAiAdapter,
} from '@/entrypoints/shared/integrations/chrome-ai/adapter';
import {
  splitPath,
  stripExtension,
} from '@/entrypoints/shared/pipeline/path-utils';
import type { UpgradeAnalysisInput } from './types';

function sanitizeBaseName(value: string): string {
  return value
    .replace(/[^\w\s-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function requestMockUpgradeAnalysis(
  input: UpgradeAnalysisInput,
  aiAdapter: BuiltInAiAdapter = createMockBuiltInAiAdapter(),
): Promise<UpgradeProposal | null> {
  const { historyItem, settings, now } = input;
  const currentName = historyItem.final;
  const { base, extension } = stripExtension(currentName);
  const baseSanitized = sanitizeBaseName(base);
  const alreadyMarked = /summary|context|upgrade/i.test(baseSanitized);

  if (alreadyMarked) {
    return null;
  }

  let enrichedBase = `${baseSanitized} summary`;
  try {
    const summarizer = aiAdapter.summarizer;
    if (await summarizer.isSupported()) {
      const summary = await summarizer.summarize({
        topic: historyItem.original,
        text: baseSanitized,
        languageHint:
          settings.language === 'auto' ? undefined : settings.language,
        maxOutputChars: Math.min(settings.maxLen, 80),
      });
      const summaryText = summary.summary.trim();
      if (
        summaryText.length > 0 &&
        summaryText.toLowerCase() !== baseSanitized.toLowerCase()
      ) {
        enrichedBase = sanitizeBaseName(summaryText);
      }
    }
  } catch (error) {
    debugLogger.warn('[UpgradeCoordinator] Mock summarizer failed', {
      historyId: historyItem.id,
      error,
    });
  }

  const appliedBase =
    enrichedBase.length > settings.maxLen
      ? enrichedBase.slice(0, settings.maxLen).trim()
      : enrichedBase;
  if (appliedBase.length === 0) {
    return null;
  }

  const proposedFilename = extension
    ? `${appliedBase}.${extension}`
    : appliedBase;
  if (proposedFilename.toLowerCase() === currentName.toLowerCase()) {
    return null;
  }

  const { directory } = splitPath(historyItem.path);
  const proposedPath = directory
    ? `${directory}/${proposedFilename}`
    : proposedFilename;

  return {
    proposedFilename,
    proposedPath,
    confidence: 'suggested',
    reasonTags: ['mock-summary', 'contextual-upgrade'],
    generatedAt: now,
  };
}
