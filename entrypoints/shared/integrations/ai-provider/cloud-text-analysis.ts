/**
 * Cloud Text Analysis Pipeline
 *
 * Handles text analysis using Google Gemini via ai-sdk.
 * Implements two-phase analysis: decision → generation
 *
 * SECURITY: All untrusted inputs (filename, content, page context) are sanitized.
 */

import type { LanguageModel } from 'ai';
import { generateText } from 'ai';
import {
  buildFilename,
  buildProposedPath,
} from '@/entrypoints/offscreen/text-analysis/filename-builder';
import { getAutoApplyBehavior } from '@/entrypoints/shared/constants/confidence-thresholds';
import { formatPageContextForPrompt } from '@/entrypoints/shared/context/page-context-formatter';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type { UpgradeProposal } from '@/entrypoints/shared/history/types';
import type {
  TextUpgradeAnalysisError,
  TextUpgradeAnalysisRequest,
  TextUpgradeAnalysisResponse,
  TextUpgradeAnalysisSuccess,
  TextUpgradeIngestionResult,
} from '@/entrypoints/shared/integrations/text-analysis/types';
import { sanitizeForPrompt } from '@/entrypoints/shared/utils/prompt-sanitization';
import { DATE_FORMAT_RULE, parseJsonResponse } from './helpers';

interface CloudDecisionResponse {
  shouldRename: boolean;
  reason: string;
  confidence: number;
  explanation: string;
}

interface CloudFilenameResponse {
  filename: string;
  reasoning: string;
}

/**
 * Analyze text using Google Gemini
 *
 * @param model - Configured Gemini model instance
 * @param request - Text analysis request with settings
 * @param ingestion - Prepared text content and metadata
 * @returns Analysis response with proposal or null
 */
export async function analyzeTextWithGemini(
  model: LanguageModel,
  request: TextUpgradeAnalysisRequest,
  ingestion: TextUpgradeIngestionResult,
): Promise<TextUpgradeAnalysisResponse | null> {
  try {
    debugLogger.log('[AI Analysis Start cloud-gemini text]', {
      requestId: request.requestId,
      filename: request.filename,
      fileType: request.fileType,
    });

    const currentFilename = request.baseline.final || request.filename;

    // Sanitize untrusted inputs (filename, page context)
    // Note: File content is from user's own file, not external/untrusted - use it directly
    const sanitizedFilename = sanitizeForPrompt(currentFilename);

    // Build page context for prompts (already sanitized by formatter)
    const pageContextInfo = formatPageContextForPrompt(request.pageContext);

    // Step 1: Decision phase - should we rename?
    const decisionPrompt = `You are a filename quality analyzer. Analyze if this filename needs improvement.

Current filename: ${sanitizedFilename}
File type: ${request.fileType}
Content summary: ${ingestion.text}${pageContextInfo}

Respond with JSON:
{
  "shouldRename": boolean,
  "reason": "string (clear-already | generic-name | contains-hash | date-format-only | content-mismatch)",
  "confidence": number (0.0-1.0),
  "explanation": "brief explanation why rename is needed or not"
}`;

    debugLogger.log('[AI Prompt cloud-gemini text decision]', {
      requestId: request.requestId,
      promptLength: decisionPrompt.length,
      prompt: decisionPrompt,
    });
    console.log('[AI Prompt cloud-gemini text decision]\n', decisionPrompt);

    const decisionResult = await generateText({
      model,
      prompt: decisionPrompt,
      temperature: 0.3,
    });

    debugLogger.log('[AI Response cloud-gemini text decision]', {
      requestId: request.requestId,
      responseLength: decisionResult.text.length,
      response: decisionResult.text,
    });

    const decision = parseJsonResponse<CloudDecisionResponse>(
      decisionResult.text,
    );

    debugLogger.log('[AI Parsed cloud-gemini text decision]', {
      requestId: request.requestId,
      parsed: decision,
    });

    if (!decision.shouldRename) {
      console.log('[CloudAI] Keeping baseline filename', {
        requestId: request.requestId,
        reason: decision.reason,
        confidence: decision.confidence,
      });
      return null;
    }

    // Step 2: Generation phase - create new filename
    const generationPrompt = `Generate a clear, descriptive filename for this file.

Content: ${ingestion.text}
Current name: ${sanitizedFilename}${pageContextInfo}
Max length: ${request.settings.maxFilenameLength} characters
Separator: ${request.settings.separator}
Language: ${request.settings.languagePreference}

Rules:
- Subject first, then qualifiers
- Use ${request.settings.separator} as word separator
- ${DATE_FORMAT_RULE}
- No file extension (will be added automatically)
- Be specific and descriptive
- Length between 20-${request.settings.maxFilenameLength} chars

Respond with JSON:
{
  "filename": "the generated filename stem without extension",
  "reasoning": "brief explanation of your choice"
}`;

    debugLogger.log('[AI Prompt cloud-gemini text generation]', {
      requestId: request.requestId,
      promptLength: generationPrompt.length,
      prompt: generationPrompt,
    });
    console.log('[AI Prompt cloud-gemini text generation]\n', generationPrompt);

    const generationResult = await generateText({
      model,
      prompt: generationPrompt,
      temperature: 0.5,
    });

    debugLogger.log('[AI Response cloud-gemini text generation]', {
      requestId: request.requestId,
      responseLength: generationResult.text.length,
      response: generationResult.text,
    });

    const generated = parseJsonResponse<CloudFilenameResponse>(
      generationResult.text,
    );

    debugLogger.log('[AI Parsed cloud-gemini text generation]', {
      requestId: request.requestId,
      parsed: generated,
    });

    // Build final filename using existing utilities
    // Note: No language parameter - Gemini handles multilingual content natively
    const filenameResult = buildFilename({
      request,
      ingestion,
      subject: generated.filename,
    });

    const proposedFilename = filenameResult.filename;
    if (!proposedFilename || proposedFilename.length === 0) {
      return null;
    }

    const currentFinal = request.baseline.final ?? request.filename;
    if (
      currentFinal &&
      currentFinal.toLowerCase() === proposedFilename.toLowerCase()
    ) {
      return null;
    }

    const proposedPath = buildProposedPath(
      request.relativePath,
      proposedFilename,
    );

    const behavior = getAutoApplyBehavior(decision.confidence);

    const proposal: UpgradeProposal = {
      proposedFilename,
      proposedPath,
      confidenceScore: behavior.confidence,
      autoApply: behavior.shouldAutoApply,
      reasonTags: ['cloud', 'gemini'],
      generatedAt: Date.now(),
      source: 'ai',
      summary: decision.explanation || generated.reasoning,
    };

    const success: TextUpgradeAnalysisSuccess = {
      status: 'success',
      requestId: request.requestId,
      analyzedAt: Date.now(),
      proposal,
      language: request.settings.languagePreference,
      languageConfidence: 1.0,
      modelSource: 'cloud',
      truncatedInput: ingestion.truncated,
      promptConfidence: behavior.confidence,
      promptUsed: true,
      decisionReason: decision.reason,
      metrics: {
        bytesFetched: ingestion.metrics.readBytes,
        requests: 2, // Decision + generation
        elapsedMs: ingestion.metrics.elapsedMs,
        promptCalls: 2,
        decisionConfidence: behavior.confidence,
      },
    };

    debugLogger.log('[AI Analysis Complete cloud-gemini text]', {
      requestId: request.requestId,
      status: 'success',
      proposedFilename,
    });

    return success;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : JSON.stringify(error);

    debugLogger.error('[AI Error cloud-gemini text]', {
      requestId: request.requestId,
      error: errorMessage,
      filename: request.filename,
    });

    const errorResponse: TextUpgradeAnalysisError = {
      status: 'error',
      requestId: request.requestId,
      analyzedAt: Date.now(),
      error: 'Cloud AI analysis failed',
      details: error instanceof Error ? error.message : String(error),
    };

    return errorResponse;
  }
}
