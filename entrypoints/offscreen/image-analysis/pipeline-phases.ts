/**
 * Image upgrade pipeline phases
 * Coordinates the three-phase analysis: describe → decide → generate
 */

import type { ImageUpgradeAnalysisRequest } from '@/entrypoints/shared/integrations/image-analysis/types';
import { generateFilenameStem } from '../text-analysis/filename-generation';
import { describeImage } from './image-description';
import { decideIfImageNeedsRename } from './image-rename-decision';

/**
 * Phase 1 result: Image description with confidence
 */
export interface DescribePhaseResult {
  description: string;
  confidence: number;
}

/**
 * Phase 2 result: Rename decision
 */
export interface DecidePhaseResult {
  shouldRename: boolean;
  reason: string;
  confidence: number;
  explanation?: string;
}

/**
 * Phase 3 result: Generated filename stem
 */
export interface GeneratePhaseResult {
  stem: string | null;
  elapsedMs: number;
}

/**
 * Run PHASE 1: Describe Image (Prompt API call #1)
 * Generate concise description of image content
 */
export async function runDescribePhase(
  blob: Blob,
  requestId: string,
): Promise<DescribePhaseResult | null> {
  const descriptionStartTime = Date.now();
  const description = await describeImage(blob);
  const descriptionElapsedMs = Date.now() - descriptionStartTime;

  if (!description) {
    return null; // Session creation failed
  }

  console.log('[ImageUpgradeAI] Image description complete', {
    requestId,
    description: description.description,
    confidence: description.confidence.toFixed(2),
    elapsedMs: descriptionElapsedMs,
  });

  return {
    description: description.description,
    confidence: description.confidence,
  };
}

/**
 * Run PHASE 2: Rename Decision (Prompt API call #2)
 * Decide if filename needs improvement
 */
export async function runDecidePhase(
  request: ImageUpgradeAnalysisRequest,
  description: string,
): Promise<DecidePhaseResult | null> {
  const decisionStartTime = Date.now();
  const decision = await decideIfImageNeedsRename({
    currentFilename: request.baseline.final || request.filename,
    description,
    fileType: request.fileType,
  });
  const decisionElapsedMs = Date.now() - decisionStartTime;

  if (!decision) {
    return null;
  }

  console.log(
    decision.shouldRename
      ? '[ImageUpgradeAI] Decision: rename needed'
      : '[ImageUpgradeAI] Keeping baseline filename',
    {
      requestId: request.requestId,
      reason: decision.reason,
      confidence: decision.confidence.toFixed(2),
      decisionElapsedMs,
    },
  );

  return {
    shouldRename: decision.shouldRename,
    reason: decision.reason,
    confidence: decision.confidence,
    explanation: decision.explanation,
  };
}

/**
 * Run PHASE 3: Filename Generation (Prompt API call #3)
 * Generate new filename stem based on description
 * For PDFs, include extracted title context to prioritize it
 */
export async function runGeneratePhase(
  request: ImageUpgradeAnalysisRequest,
  description: string,
): Promise<GeneratePhaseResult> {
  const generationStartTime = Date.now();

  const generatedStem = await generateFilenameStem({
    summary: description,
    language: 'en', // Images described in English
    currentBaseline: request.baseline.final || request.filename,
    settings: {
      maxLength: request.settings.maxFilenameLength,
      separator: request.settings.separator,
      transliterateAscii: request.settings.transliterateAscii,
    },
    // Pass PDF context if available (type-safe extraction)
    ...(request.pdfContext && {
      pdfContext: {
        source: 'pdf' as const,
        documentTitle: request.pdfContext.documentTitle,
        shouldPrioritizeTitle: request.pdfContext.shouldPrioritizeTitle,
      },
    }),
  });

  const generationElapsedMs = Date.now() - generationStartTime;

  console.log('[ImageUpgradeAI] Filename generation complete', {
    requestId: request.requestId,
    generatedStem,
    usedFallback: !generatedStem,
    elapsedMs: generationElapsedMs,
  });

  return {
    stem: generatedStem,
    elapsedMs: generationElapsedMs,
  };
}
