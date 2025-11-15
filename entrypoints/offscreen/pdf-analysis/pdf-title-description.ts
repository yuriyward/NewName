/**
 * PDF-specific Phase 1: Extract exact titles and detailed descriptions from PDF pages
 * This is separate from image analysis - PDFs only
 * Analyzes both pages to find document titles and gather comprehensive context
 */

import { formatPageContextForPrompt } from '@/entrypoints/shared/context/page-context-formatter';
import { offscreenLogger } from '@/entrypoints/shared/debug/offscreen-logger';
import type { PageContext } from '@/entrypoints/shared/state/page-context-store';
import {
  createPromptSession,
  destroyPromptSession,
} from '../text-analysis/prompt-helpers';

/**
 * Result of analyzing a single PDF page for title and description
 */
export interface PdfPageAnalysis {
  pageNumber: number;
  title: string | null; // Exact document/page title if found
  description: string; // What the page shows
  confidence: number; // 0.0 to 1.0
  hasTitle: boolean; // Whether a title was detected
}

/**
 * Merged context from analyzing multiple PDF pages
 */
export interface PdfTitleDescriptionContext {
  documentTitle: string | null; // Primary document title (from page 1 or 2)
  pageAnalyses: PdfPageAnalysis[];
  mergedDescription: string; // Combined context from both pages
  confidence: number;
}

const PDF_TITLE_EXTRACTION_SYSTEM_PROMPT = `You are a document title and content analyzer specialized in PDFs.
Your task is to examine a PDF page and extract the exact document or article title if present, then describe what the page shows.

For each page, you need to:
1. Look for document titles, article headlines, or main headings at the top of the page
2. Extract the EXACT title text if it's clearly visible
3. Provide a clear, concise description of what this page shows

Guidelines:
- Be precise: extract titles exactly as they appear
- If no clear title exists, return null for title
- Descriptions should focus on the main content and purpose
- Keep descriptions concise but comprehensive (mention key topics, visual elements, structure)
- Natural language: describe as you'd explain it to someone
- Focus on important details that help identify the document`;

/**
 * Analyze a single PDF page for title and description
 * @param pageBlob - PNG blob of rendered PDF page
 * @param pageNumber - Page number (1-indexed)
 * @returns Page analysis with title and description
 */
function isValidModelResponse(
  value: unknown,
): value is { title?: string | null; description: string } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const { description, title } = record;

  if (typeof description !== 'string' || description.trim().length === 0) {
    return false;
  }

  if (title === undefined || title === null || typeof title === 'string') {
    return true;
  }

  return false;
}

function normalizeTitle(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.toLowerCase() === 'null' ? null : trimmed;
}

async function analyzePdfPage(
  pageBlob: Blob,
  pageNumber: number,
  pageContext?: Pick<PageContext, 'title' | 'heading' | 'url'>,
): Promise<PdfPageAnalysis | null> {
  let session: Awaited<ReturnType<typeof createPromptSession>> = null;

  try {
    offscreenLogger.log(
      `[PdfTitleDescription] Analyzing page ${pageNumber} for title`,
    );

    // Create multimodal session for analyzing PDF page images
    session = await createPromptSession({
      systemPrompt: PDF_TITLE_EXTRACTION_SYSTEM_PROMPT,
      temperature: 0.3, // Lower temp for more precise title extraction
      topK: 10,
      expectedInputs: [{ type: 'image' }, { type: 'text' }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
      outputLanguage: 'en',
    });

    if (!session) {
      offscreenLogger.warn(
        '[PdfTitleDescription] Failed to create multimodal session',
      );
      return null;
    }

    // Prompt to extract title and description
    let promptText = `Analyze this PDF page and provide:
1. EXACT document/article title if present at the top (null if no clear title)
2. A concise description of what this page shows, including main topics and content type`;

    // Add page context as a hint if available
    promptText += formatPageContextForPrompt(pageContext, {
      prefix:
        '\n\nNote: This PDF was downloaded from the following page. This may provide context about the document origin:',
    });

    promptText += `\n\nFormat your response as JSON with exactly this structure:
{
  "title": "Exact title here or null",
  "description": "What this page shows - 2-3 sentences covering main topics and content"
}`;

    // Send prompt with image content using multimodal format
    const response = await session.prompt([
      {
        role: 'user',
        content: [
          { type: 'text', value: promptText },
          { type: 'image', value: pageBlob },
        ],
      },
    ]);

    // Parse the JSON response
    let parsed: unknown = null;
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (_e) {
      offscreenLogger.warn(
        '[PdfTitleDescription] Failed to parse JSON response',
        {
          response,
        },
      );
    }

    if (!isValidModelResponse(parsed)) {
      offscreenLogger.warn(
        `[PdfTitleDescription] Invalid response structure from page ${pageNumber}`,
        { parsed },
      );
      return null;
    }

    const parsedTitle = normalizeTitle(parsed.title ?? null);
    const description = parsed.description.trim();

    const analysis: PdfPageAnalysis = {
      pageNumber,
      title: parsedTitle,
      description,
      confidence: 0.85, // Baseline confidence for model-analyzed pages
      hasTitle: parsedTitle !== null,
    };

    offscreenLogger.log(
      `[PdfTitleDescription] Page ${pageNumber} analysis complete`,
      {
        hasTitle: analysis.hasTitle,
        titleLength: analysis.title?.length,
        descriptionLength: analysis.description.length,
      },
    );

    return analysis;
  } catch (error) {
    offscreenLogger.warn(
      `[PdfTitleDescription] Failed to analyze page ${pageNumber}`,
      { error },
    );
    return null;
  } finally {
    if (session) {
      destroyPromptSession(session);
    }
  }
}

/**
 * Analyze multiple PDF pages and extract titles and descriptions
 * @param pageBlobs - Array of PNG blobs from extracted PDF pages
 * @returns Merged context with document title and combined descriptions
 */
export async function extractPdfTitlesAndDescriptions(
  pageBlobs: Blob[],
  pageContext?: Pick<PageContext, 'title' | 'heading' | 'url'>,
): Promise<PdfTitleDescriptionContext | null> {
  if (pageBlobs.length === 0) {
    offscreenLogger.warn(
      '[PdfTitleDescription] No pages provided for analysis',
    );
    return null;
  }

  offscreenLogger.log('[PdfTitleDescription] Starting analysis of PDF pages', {
    pageCount: pageBlobs.length,
  });

  const startTime = Date.now();

  // Analyze each page
  const pageAnalyses: PdfPageAnalysis[] = [];
  for (let i = 0; i < pageBlobs.length; i++) {
    const analysis = await analyzePdfPage(pageBlobs[i], i + 1, pageContext);
    if (analysis) {
      pageAnalyses.push(analysis);
    }
  }

  if (pageAnalyses.length === 0) {
    offscreenLogger.warn('[PdfTitleDescription] Failed to analyze any pages');
    return null;
  }

  // Extract primary title (prefer page 1, fallback to page 2)
  const documentTitle =
    pageAnalyses.find((a) => a.pageNumber === 1)?.title ||
    pageAnalyses.find((a) => a.hasTitle)?.title ||
    null;

  // Merge descriptions with page context
  const mergedDescription = pageAnalyses
    .map(
      (analysis) =>
        `Page ${analysis.pageNumber}${analysis.title ? ` (${analysis.title})` : ''}: ${analysis.description}`,
    )
    .join('\n\n');

  const elapsedMs = Date.now() - startTime;

  const context: PdfTitleDescriptionContext = {
    documentTitle,
    pageAnalyses,
    mergedDescription,
    confidence:
      pageAnalyses.reduce((sum, a) => sum + a.confidence, 0) /
      pageAnalyses.length,
  };

  offscreenLogger.log('[PdfTitleDescription] Analysis complete', {
    pagesAnalyzed: pageAnalyses.length,
    documentTitle: documentTitle ? 'found' : 'not-found',
    elapsedMs,
    confidence: context.confidence.toFixed(2),
  });

  return context;
}
