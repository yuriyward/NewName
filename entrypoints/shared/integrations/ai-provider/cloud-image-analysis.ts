/**
 * Cloud Image Analysis Pipeline
 *
 * Handles image analysis using Google Gemini via ai-sdk.
 * Implements three-phase analysis: description → decision → generation
 */

import type { LanguageModel } from 'ai';
import { generateText } from 'ai';
import { buildProposedPath } from '@/entrypoints/offscreen/text-analysis/filename-builder';
import type { UpgradeProposal } from '@/entrypoints/shared/history/types';
import type {
  ImageIngestionResult,
  ImageUpgradeAnalysisRequest,
  ImageUpgradeAnalysisResponse,
} from '@/entrypoints/shared/integrations/image-analysis/types';
import { arrayBufferToBase64 } from '@/entrypoints/shared/utils/encoding';
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
 * Analyze image using Google Gemini
 *
 * @param model - Configured Gemini model instance
 * @param request - Image analysis request with settings
 * @param ingestion - Prepared image data and metadata
 * @returns Analysis response with proposal or null
 */
export async function analyzeImageWithGemini(
  model: LanguageModel,
  request: ImageUpgradeAnalysisRequest,
  ingestion: ImageIngestionResult,
): Promise<ImageUpgradeAnalysisResponse | null> {
  try {
    const currentFilename = request.baseline.final || request.filename;

    // Convert blob to base64 for ai-sdk using browser-compatible method
    const arrayBuffer = await ingestion.blob.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);
    const dataUrl = `data:${ingestion.mimeType};base64,${base64}`;

    // Step 1: Describe the image
    const descriptionResult = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe this image in 1-2 sentences. Be specific and concise.',
            },
            {
              type: 'image',
              image: dataUrl,
            },
          ],
        },
      ],
      temperature: 0.3,
    });

    const description = descriptionResult.text;

    // Step 2: Decision phase
    const decisionResult = await generateText({
      model,
      prompt: `Should this image filename be improved?

Current filename: ${currentFilename}
Image description: ${description}

Respond with JSON:
{
  "shouldRename": boolean,
  "reason": "string",
  "confidence": number (0.0-1.0),
  "explanation": "brief explanation"
}`,
      temperature: 0.3,
    });

    const decision = parseJsonResponse<CloudDecisionResponse>(
      decisionResult.text,
    );

    if (!decision.shouldRename) {
      console.log('[CloudAI] Keeping baseline image filename', {
        requestId: request.requestId,
        reason: decision.reason,
      });
      return null;
    }

    // Step 3: Generate filename
    const generationResult = await generateText({
      model,
      prompt: `Generate a descriptive filename for this image.

Description: ${description}
Current name: ${currentFilename}
Max length: ${request.settings.maxFilenameLength} characters
Separator: ${request.settings.separator}

Rules:
- Subject first, then qualifiers
- Use ${request.settings.separator} as word separator
- ${DATE_FORMAT_RULE}
- No file extension
- Be specific
- Length: 20-${request.settings.maxFilenameLength} chars

Respond with JSON:
{
  "filename": "the generated filename stem",
  "reasoning": "brief explanation"
}`,
      temperature: 0.5,
    });

    const generated = parseJsonResponse<CloudFilenameResponse>(
      generationResult.text,
    );

    // Build proposal
    const proposedFilename = `${generated.filename}.${request.filename.split('.').pop()}`;
    const proposedPath = buildProposedPath(
      request.relativePath,
      proposedFilename,
    );

    const proposal: UpgradeProposal = {
      proposedFilename,
      proposedPath,
      confidence: decision.confidence >= 0.8 ? 'high' : 'suggested',
      autoApply: decision.confidence >= 0.9,
      reasonTags: ['cloud', 'gemini', 'image'],
      generatedAt: Date.now(),
      source: 'ai',
      summary: decision.explanation || description,
    };

    return {
      status: 'success',
      requestId: request.requestId,
      analyzedAt: Date.now(),
      proposal,
      description,
      modelSource: 'cloud',
      promptConfidence: decision.confidence,
      promptUsed: true,
      decisionReason: decision.reason,
      metrics: {
        bytesFetched: ingestion.metrics.readBytes,
        requests: 3,
        elapsedMs: ingestion.metrics.elapsedMs,
        promptCalls: 3,
        decisionConfidence: decision.confidence,
        resizeRatio: ingestion.resizeRatio,
        originalWidth: ingestion.originalWidth,
        originalHeight: ingestion.originalHeight,
        resizedWidth: ingestion.resizedWidth,
        resizedHeight: ingestion.resizedHeight,
      },
    };
  } catch (error) {
    console.error('[CloudAI] Image analysis failed', { error, request });

    return {
      status: 'error',
      requestId: request.requestId,
      analyzedAt: Date.now(),
      error: 'Cloud AI image analysis failed',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}
