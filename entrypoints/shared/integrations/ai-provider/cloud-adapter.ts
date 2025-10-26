/**
 * Cloud AI Adapter
 *
 * Integrates with cloud AI services (Google Gemini) via ai-sdk.
 * Provides fallback/alternative to local Chrome AI processing.
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { mergePdfContext } from '@/entrypoints/offscreen/pdf-analysis/pdf-context-merger';
import { decidePdfRename } from '@/entrypoints/offscreen/pdf-analysis/pdf-rename-decision';
import type {
  PdfUpgradeAnalysisRequest,
  RenderedPdfPage,
} from '@/entrypoints/offscreen/pdf-analysis/types';
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
import { applyFilenamePolicy } from '@/entrypoints/shared/naming/policy-engine';
import type { CloudModel } from '@/entrypoints/shared/settings/types';
import { arrayBufferToBase64 } from '@/entrypoints/shared/utils/encoding';
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
 * Smart JSON parser that handles both markdown-wrapped and raw JSON responses
 *
 * Gemini sometimes wraps JSON in markdown code blocks like:
 * ```json
 * { "key": "value" }
 * ```
 *
 * This parser automatically detects and unwraps markdown, then parses the JSON.
 *
 * @param text - Response text from Gemini API
 * @returns Parsed JSON object
 * @throws SyntaxError if the text is not valid JSON after unwrapping
 */
function parseJsonResponse<T>(text: string): T {
  let cleaned = text.trim();

  // Check if wrapped in markdown code fence (```json ... ``` or ``` ... ```)
  const markdownMatch = cleaned.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/);
  if (markdownMatch) {
    cleaned = markdownMatch[1].trim();
  }

  return JSON.parse(cleaned);
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

      const decision = parseJsonResponse<CloudDecisionResponse>(
        decisionResult.text,
      );

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
- Format dates as YYYY-MM-DD (use dashes, not YYYYMMDD)
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

      const generated = parseJsonResponse<CloudFilenameResponse>(
        generationResult.text,
      );

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
- Format dates as YYYY-MM-DD (use dashes, not YYYYMMDD)
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

  /**
   * Analyze PDF using Google Gemini
   *
   * Implements 3-phase pipeline mirroring local PDF analysis:
   * Phase 1: Extract title and description from rendered PDF pages
   * Phase 2: Decide if rename is needed (reuses decidePdfRename)
   * Phase 3: Generate filename from merged context
   */
  async analyzePdf(
    request: PdfUpgradeAnalysisRequest,
    pages: RenderedPdfPage[],
  ): Promise<ImageUpgradeAnalysisResponse | null> {
    if (pages.length === 0) {
      console.warn('[CloudAI] No PDF pages provided for analysis');
      return null;
    }

    try {
      const google = this.getProvider();
      const model = google(this.modelId);

      console.log('[CloudAI] Starting PDF analysis', {
        requestId: request.requestId,
        pageCount: pages.length,
      });

      // PHASE 1: Extract title and description from each page
      const pageAnalyses = [];
      for (const page of pages) {
        const arrayBuffer = await page.blob.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);
        const dataUrl = `data:image/png;base64,${base64}`;

        const analysisResult = await generateText({
          model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this PDF page and provide:
1. EXACT document/article title if present at the top (null if no clear title)
2. A concise description of what this page shows, including main topics and content type

Format your response as JSON with exactly this structure:
{
  "title": "Exact title here or null",
  "description": "What this page shows - 2-3 sentences covering main topics and content"
}`,
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

        try {
          const parsed = parseJsonResponse<{
            title?: string | null;
            description: string;
          }>(analysisResult.text);

          const normalizedTitle =
            typeof parsed.title === 'string' &&
            parsed.title.trim().length > 0 &&
            parsed.title.toLowerCase() !== 'null'
              ? parsed.title.trim()
              : null;

          pageAnalyses.push({
            pageNumber: page.pageNumber,
            title: normalizedTitle,
            description: parsed.description.trim(),
            confidence: 0.85,
            hasTitle: normalizedTitle !== null,
          });
        } catch (parseError) {
          console.warn('[CloudAI] Failed to parse page analysis', {
            page: page.pageNumber,
            error: parseError,
          });
        }
      }

      if (pageAnalyses.length === 0) {
        console.warn('[CloudAI] Failed to analyze any PDF pages');
        return null;
      }

      // Extract document title (prefer page 1, fallback to any page with title)
      const documentTitle =
        pageAnalyses.find((a) => a.pageNumber === 1)?.title ||
        pageAnalyses.find((a) => a.hasTitle)?.title ||
        null;

      // Build merged description
      const mergedDescription = pageAnalyses
        .map(
          (analysis) =>
            `Page ${analysis.pageNumber}${analysis.title ? ` (${analysis.title})` : ''}: ${analysis.description}`,
        )
        .join('\n\n');

      const titleDescriptionContext = {
        documentTitle,
        pageAnalyses,
        mergedDescription,
        confidence:
          pageAnalyses.reduce((sum, a) => sum + a.confidence, 0) /
          pageAnalyses.length,
      };

      console.log('[CloudAI] PDF Phase 1 complete - Title extraction', {
        hasTitle: !!documentTitle,
        pagesAnalyzed: pageAnalyses.length,
      });

      // PHASE 2: Decide if rename is needed (reuse shared logic)
      const currentFilename = request.baseline.final || request.filename;
      const renameDecision = await decidePdfRename(
        titleDescriptionContext,
        currentFilename,
      );

      if (!renameDecision.shouldRename) {
        console.log('[CloudAI] PDF Phase 2 - No rename needed', {
          reason: renameDecision.reason,
        });
        return null;
      }

      console.log('[CloudAI] PDF Phase 2 complete - Rename decision', {
        shouldRename: renameDecision.shouldRename,
        confidence: renameDecision.confidence,
      });

      // Merge PDF context for filename generation
      const mergedContext = mergePdfContext(titleDescriptionContext);

      // PHASE 3: Generate filename using Gemini
      const generationResult = await generateText({
        model,
        prompt: `Generate a clear, descriptive filename for this PDF document.

${mergedContext.fullDescription}

Current name: ${currentFilename}
Max length: ${request.settings.maxFilenameLength} characters

${
  mergedContext.shouldPrioritizeTitle && mergedContext.documentTitle
    ? `IMPORTANT: This PDF has a document title: "${mergedContext.documentTitle}". Use this title as the primary component of the filename.`
    : ''
}

Rules:
- Use spaces to separate words (e.g., "Machine Learning Algorithms" not "Machine-Learning-Algorithms")
- Subject first, then qualifiers
- Format dates as YYYY-MM-DD if present
- No file extension (will be added automatically)
- Be specific and descriptive
- Length between 20-${request.settings.maxFilenameLength} chars
- Use proper capitalization (Title Case)

Respond with JSON:
{
  "filename": "the generated filename stem with spaces between words",
  "reasoning": "brief explanation of your choice"
}`,
        temperature: 0.5,
      });

      const generated = parseJsonResponse<CloudFilenameResponse>(
        generationResult.text,
      );

      // Apply filename policy to normalize separators according to user settings
      const policyResult = applyFilenamePolicy({
        subject: generated.filename,
        qualifiers: [],
        extension: 'pdf',
        maxLength: request.settings.maxFilenameLength,
        separator: request.settings.separator,
        transliterateAscii: request.settings.transliterateAscii,
      });

      const proposedFilename = policyResult.filename;
      const proposedPath = buildProposedPath(
        request.relativePath,
        proposedFilename,
      );

      const proposal: UpgradeProposal = {
        proposedFilename,
        proposedPath,
        confidence: renameDecision.confidence >= 0.8 ? 'high' : 'suggested',
        autoApply: renameDecision.confidence >= 0.9,
        reasonTags: ['cloud', 'gemini', 'pdf'],
        generatedAt: Date.now(),
        source: 'ai',
        summary:
          renameDecision.explanation ||
          generated.reasoning ||
          mergedContext.fullDescription.slice(0, 200),
      };

      console.log('[CloudAI] PDF Phase 3 complete - Filename generated', {
        requestId: request.requestId,
        proposedFilename,
      });

      return {
        status: 'success',
        requestId: request.requestId,
        analyzedAt: Date.now(),
        proposal,
        description: mergedContext.fullDescription,
        modelSource: 'cloud',
        promptConfidence: renameDecision.confidence,
        promptUsed: true,
        decisionReason: renameDecision.reason,
        metrics: {
          bytesFetched: pages.reduce((sum, p) => sum + p.blob.size, 0),
          requests: pageAnalyses.length + 1, // Page analyses + generation
          elapsedMs: 0,
          promptCalls: pageAnalyses.length + 1,
          decisionConfidence: renameDecision.confidence,
        },
      };
    } catch (error) {
      console.error('[CloudAI] PDF analysis failed', { error, request });

      return {
        status: 'error',
        requestId: request.requestId,
        analyzedAt: Date.now(),
        error: 'Cloud AI PDF analysis failed',
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
