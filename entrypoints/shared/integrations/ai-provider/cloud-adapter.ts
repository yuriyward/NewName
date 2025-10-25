/**
 * Cloud AI Adapter
 *
 * Integrates with cloud AI services (Google Gemini) via ai-sdk.
 * Provides fallback/alternative to local Chrome AI processing.
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import type { PdfUpgradeAnalysisRequest } from '@/entrypoints/offscreen/pdf-analysis/types';
import {
  buildFilename,
  buildProposedPath,
} from '@/entrypoints/offscreen/text-analysis/filename-builder';
import type { UpgradeProposal } from '@/entrypoints/shared/history/types';
import type {
  ImageIngestionResult,
  ImageUpgradeAnalysisRequest,
  ImageUpgradeAnalysisResponse,
} from '@/entrypoints/shared/integrations/image-analysis/types';
import type {
  TextUpgradeAnalysisError,
  TextUpgradeAnalysisRequest,
  TextUpgradeAnalysisResponse,
  TextUpgradeAnalysisSuccess,
  TextUpgradeIngestionResult,
} from '@/entrypoints/shared/integrations/text-analysis/types';
import type { CloudModel } from '@/entrypoints/shared/settings/types';
import type { IAiProvider } from './types';

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
 * Cloud AI provider using Google Gemini via ai-sdk
 *
 * Sends prepared data (text snippets, downscaled images) to Gemini API.
 * Never sends raw files to maintain data minimization principles.
 */
export class CloudAiAdapter implements IAiProvider {
  readonly type = 'cloud' as const;
  private apiKey: string | null = null;
  private modelId: CloudModel = 'gemini-flash-lite-latest';

  /**
   * Set the API key for cloud requests
   * @param apiKey - Google Gemini API key
   */
  setApiKey(apiKey: string | null): void {
    this.apiKey = apiKey;
  }

  /**
   * Set the model to use for cloud requests
   * @param modelId - Model identifier (e.g., 'gemini-flash-lite-latest')
   */
  setModel(modelId: CloudModel): void {
    this.modelId = modelId;
  }

  /**
   * Check if cloud AI is available (API key configured)
   */
  async isAvailable(): Promise<boolean> {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  /**
   * Get configured Google provider instance
   */
  private getProvider() {
    if (!this.apiKey) {
      throw new Error('Cloud AI API key not configured');
    }

    return createGoogleGenerativeAI({
      apiKey: this.apiKey,
    });
  }

  /**
   * Analyze text using Google Gemini
   *
   * Sends extracted text (already prepared) to Gemini for analysis.
   */
  async analyzeText(
    request: TextUpgradeAnalysisRequest,
    ingestion: TextUpgradeIngestionResult,
  ): Promise<TextUpgradeAnalysisResponse | null> {
    try {
      const google = this.getProvider();
      const model = google(this.modelId);

      const currentFilename = request.baseline.final || request.filename;

      // Step 1: Decision phase - should we rename?
      const decisionResult = await generateText({
        model,
        prompt: `You are a filename quality analyzer. Analyze if this filename needs improvement.

Current filename: ${currentFilename}
File type: ${request.fileType}
Content summary: ${ingestion.text.slice(0, 500)}

Respond with JSON:
{
  "shouldRename": boolean,
  "reason": "string (clear-already | generic-name | contains-hash | date-format-only | content-mismatch)",
  "confidence": number (0.0-1.0),
  "explanation": "brief explanation why rename is needed or not"
}`,
        temperature: 0.3,
      });

      const decision: CloudDecisionResponse = JSON.parse(decisionResult.text);

      if (!decision.shouldRename) {
        console.log('[CloudAI] Keeping baseline filename', {
          requestId: request.requestId,
          reason: decision.reason,
          confidence: decision.confidence,
        });
        return null;
      }

      // Step 2: Generation phase - create new filename
      const generationResult = await generateText({
        model,
        prompt: `Generate a clear, descriptive filename for this file.

Content: ${ingestion.text.slice(0, 1000)}
Current name: ${currentFilename}
Max length: ${request.settings.maxFilenameLength} characters
Separator: ${request.settings.separator}
Language: ${request.settings.languagePreference}

Rules:
- Subject first, then qualifiers
- Use ${request.settings.separator} as word separator
- No file extension (will be added automatically)
- Be specific and descriptive
- Length between 20-${request.settings.maxFilenameLength} chars

Respond with JSON:
{
  "filename": "the generated filename stem without extension",
  "reasoning": "brief explanation of your choice"
}`,
        temperature: 0.5,
      });

      const generated: CloudFilenameResponse = JSON.parse(
        generationResult.text,
      );

      // Build final filename using existing utilities
      const filenameResult = buildFilename({
        request,
        ingestion,
        subject: generated.filename,
        language: request.settings.languagePreference,
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

      const shouldAutoApply = decision.confidence >= 0.9;

      const proposal: UpgradeProposal = {
        proposedFilename,
        proposedPath,
        confidence: decision.confidence >= 0.8 ? 'high' : 'suggested',
        autoApply: shouldAutoApply,
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
        promptConfidence: decision.confidence,
        promptUsed: true,
        decisionReason: decision.reason,
        metrics: {
          bytesFetched: ingestion.metrics.readBytes,
          requests: 2, // Decision + generation
          elapsedMs: ingestion.metrics.elapsedMs,
          promptCalls: 2,
          decisionConfidence: decision.confidence,
        },
      };

      console.log('[CloudAI] Proposal created', {
        requestId: request.requestId,
        proposedFilename,
      });

      return success;
    } catch (error) {
      console.error('[CloudAI] Text analysis failed', { error, request });

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

  /**
   * Analyze image using Google Gemini
   *
   * Sends downscaled image (already prepared) to Gemini for analysis.
   */
  async analyzeImage(
    request: ImageUpgradeAnalysisRequest,
    ingestion: ImageIngestionResult,
  ): Promise<ImageUpgradeAnalysisResponse | null> {
    try {
      const google = this.getProvider();
      const model = google(this.modelId);

      const currentFilename = request.baseline.final || request.filename;

      // Convert blob to base64 for ai-sdk
      const arrayBuffer = await ingestion.blob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
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

      const decision: CloudDecisionResponse = JSON.parse(decisionResult.text);

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

      const generated: CloudFilenameResponse = JSON.parse(
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

  /**
   * Analyze PDF using Google Gemini
   *
   * Currently delegates to image analysis of rendered pages.
   * Future: Could use PDF file input directly via ai-sdk.
   */
  async analyzePdf(
    _request: PdfUpgradeAnalysisRequest,
  ): Promise<ImageUpgradeAnalysisResponse | null> {
    // For now, PDF analysis is handled by rendering pages to images
    // and analyzing via the existing PDF pipeline.
    // Cloud fallback for PDFs will be implemented in the router layer.
    console.warn(
      '[CloudAI] PDF analysis not yet implemented for cloud provider',
    );
    return null;
  }
}
