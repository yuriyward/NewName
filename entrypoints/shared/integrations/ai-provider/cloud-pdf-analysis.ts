/**
 * Cloud PDF Analysis Pipeline
 *
 * Handles PDF analysis using Google Gemini via ai-sdk.
 * Implements three-phase analysis: title extraction → decision → generation
 */

import type { LanguageModel } from 'ai';
import { generateText } from 'ai';
import { mergePdfContext } from '@/entrypoints/offscreen/pdf-analysis/pdf-context-merger';
import { decidePdfRename } from '@/entrypoints/offscreen/pdf-analysis/pdf-rename-decision';
import type {
  PdfUpgradeAnalysisRequest,
  RenderedPdfPage,
} from '@/entrypoints/offscreen/pdf-analysis/types';
import { buildProposedPath } from '@/entrypoints/offscreen/text-analysis/filename-builder';
import { getAutoApplyBehavior } from '@/entrypoints/shared/constants/confidence-thresholds';
import { formatPageContextForPrompt } from '@/entrypoints/shared/context/page-context-formatter';
import type { UpgradeProposal } from '@/entrypoints/shared/history/types';
import type { ImageUpgradeAnalysisResponse } from '@/entrypoints/shared/integrations/image-analysis/types';
import { applyFilenamePolicy } from '@/entrypoints/shared/naming/policy-engine';
import { arrayBufferToBase64 } from '@/entrypoints/shared/utils/encoding';
import { DATE_FORMAT_RULE, parseJsonResponse } from './helpers';

/**
 * Content length limits for prompt engineering
 * Controls how much content is sent to cloud AI for analysis
 */
const PDF_SUMMARY_FALLBACK_MAX_CHARS = 200; // Truncated description for proposal summary

interface CloudFilenameResponse {
  filename: string;
  reasoning: string;
}

/**
 * Analyze PDF using Google Gemini
 *
 * Implements 3-phase pipeline mirroring local PDF analysis:
 * - Phase 1: Extract title and description from rendered PDF pages
 * - Phase 2: Decide if rename is needed (reuses decidePdfRename)
 * - Phase 3: Generate filename from merged context
 *
 * @param model - Configured Gemini model instance
 * @param request - PDF analysis request with settings
 * @param pages - Rendered PDF pages as images
 * @returns Analysis response with proposal or null
 */
export async function analyzePdfWithGemini(
  model: LanguageModel,
  request: PdfUpgradeAnalysisRequest,
  pages: RenderedPdfPage[],
): Promise<ImageUpgradeAnalysisResponse | null> {
  if (pages.length === 0) {
    console.warn('[CloudAI] No PDF pages provided for analysis');
    return null;
  }

  try {
    console.log('[CloudAI] Starting PDF analysis', {
      requestId: request.requestId,
      pageCount: pages.length,
    });

    // Build page context for prompts
    const pageContextInfo = formatPageContextForPrompt(request.pageContext, {
      prefix:
        '\n\nNote: This PDF was downloaded from the following page. This may provide context about the document origin:',
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
2. A concise description of what this page shows, including main topics and content type${pageContextInfo}

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

Current name: ${currentFilename}${pageContextInfo}
Max length: ${request.settings.maxFilenameLength} characters

${
  mergedContext.shouldPrioritizeTitle && mergedContext.documentTitle
    ? `IMPORTANT: This PDF has a document title: "${mergedContext.documentTitle}". Use this title as the primary component of the filename.`
    : ''
}

Rules:
- Use spaces to separate words (e.g., "Machine Learning Algorithms" not "Machine-Learning-Algorithms")
- Subject first, then qualifiers
- ${DATE_FORMAT_RULE} if present
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

    const behavior = getAutoApplyBehavior(renameDecision.confidence);

    const proposal: UpgradeProposal = {
      proposedFilename,
      proposedPath,
      confidenceScore: behavior.confidence,
      autoApply: behavior.shouldAutoApply,
      reasonTags: ['cloud', 'gemini', 'pdf'],
      generatedAt: Date.now(),
      source: 'ai',
      summary:
        renameDecision.explanation ||
        generated.reasoning ||
        mergedContext.fullDescription.slice(0, PDF_SUMMARY_FALLBACK_MAX_CHARS),
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
      promptConfidence: behavior.confidence,
      promptUsed: true,
      decisionReason: renameDecision.reason,
      metrics: {
        bytesFetched: pages.reduce((sum, p) => sum + p.blob.size, 0),
        requests: pageAnalyses.length + 1, // Page analyses + generation
        elapsedMs: 0,
        promptCalls: pageAnalyses.length + 1,
        decisionConfidence: behavior.confidence,
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
