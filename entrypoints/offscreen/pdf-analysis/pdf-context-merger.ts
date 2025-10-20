/**
 * PDF context merger for combining analysis from multiple pages
 * Creates enhanced context for filename generation based on extracted titles and descriptions
 */

import type { PdfTitleDescriptionContext } from './pdf-title-description';

/**
 * Merged PDF context ready for filename generation
 * This context will be passed to the filename generation phase
 */
export interface MergedPdfContext {
  source: 'pdf';
  documentTitle: string | null; // Exact title to prioritize in filename
  fullDescription: string; // Complete description from all pages
  pageContext: string; // Human-readable page context
  shouldPrioritizeTitle: boolean; // Whether title extraction was successful
}

/**
 * Merge PDF page analysis results into context for filename generation
 * This enhances the context by:
 * 1. Prioritizing the extracted document title
 * 2. Combining descriptions from all pages
 * 3. Creating a rich context string for the AI
 *
 * @param titleDescriptionContext - Result from PDF title/description extraction
 * @returns Merged context ready for filename generation
 */
export function mergePdfContext(
  titleDescriptionContext: PdfTitleDescriptionContext,
): MergedPdfContext {
  const { documentTitle, mergedDescription, pageAnalyses } =
    titleDescriptionContext;

  // Create human-readable page context
  const pageContext =
    pageAnalyses.length > 1
      ? `Multi-page document (${pageAnalyses.length} pages analyzed). ${pageAnalyses.length > 1 ? `First page${documentTitle ? ` titled "${documentTitle}"` : ''} introduces the document.` : ''}`
      : `Single page document${documentTitle ? ` titled "${documentTitle}"` : ''}.`;

  // Combine full description with title context
  const fullDescription =
    documentTitle && documentTitle.trim().length > 0
      ? `Document Title: "${documentTitle}"\n\nContent:\n${mergedDescription}`
      : mergedDescription;

  return {
    source: 'pdf',
    documentTitle:
      documentTitle && documentTitle.trim().length > 0 ? documentTitle : null,
    fullDescription,
    pageContext,
    shouldPrioritizeTitle: !!documentTitle && documentTitle.trim().length > 0,
  };
}

/**
 * Build enhanced context string for filename generation
 * This is passed to the filename generation phase to help the AI understand
 * that it should prioritize the extracted document title in the filename
 *
 * @param context - Merged PDF context
 * @returns Formatted context string for the prompt
 */
export function buildPdfContextForFilenameGeneration(
  context: MergedPdfContext,
): string {
  if (!context.shouldPrioritizeTitle || !context.documentTitle) {
    return context.fullDescription;
  }

  // Emphasize the exact title to the filename generator
  return (
    `PDF ANALYSIS RESULTS:\n` +
    `- Exact Document Title: "${context.documentTitle}"\n` +
    `- Document Type: ${context.pageContext}\n\n` +
    `PRIORITY: Use the exact document title as the primary component of the filename if possible.\n` +
    `Content Summary:\n` +
    `${context.fullDescription}`
  );
}
