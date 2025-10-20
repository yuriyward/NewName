/**
 * PDF-specific Phase 2: Rename Decision
 * Decides if a PDF should be renamed based on extracted title and content
 * Separate from image pipeline to properly handle document titles
 */

import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type { PdfTitleDescriptionContext } from './pdf-title-description';

/**
 * Result of PDF rename decision
 */
export interface PdfRenameDecision {
  shouldRename: boolean;
  reason:
    | 'pdf-title-extracted' // Extracted a clear document title
    | 'pdf-title-descriptive' // Title found and is descriptive
    | 'baseline-generic' // Current name is generic (meaningless)
    | 'baseline-hash' // Current name is a hash or UUID
    | 'baseline-timestamp' // Current name is timestamp only
    | 'already-descriptive' // Current name is already good
    | 'already-good'; // No rename needed
  confidence: number; // 0.0 to 1.0
  explanation?: string; // Brief explanation
}

/**
 * Decide if a PDF should be renamed based on extracted titles and descriptions
 *
 * @param titleDescriptionContext - Result from Phase 1 analysis
 * @param currentFilename - Current PDF filename
 * @returns Rename decision
 */
export async function decidePdfRename(
  titleDescriptionContext: PdfTitleDescriptionContext,
  currentFilename: string,
): Promise<PdfRenameDecision> {
  const { documentTitle, pageAnalyses } = titleDescriptionContext;

  console.log('[PdfRenameDecision] Analyzing rename decision', {
    hasTitle: !!documentTitle,
    titleLength: documentTitle?.length,
    currentFilename,
    pagesAnalyzed: pageAnalyses.length,
  });

  // If we extracted a clear document title, definitely rename
  if (documentTitle && documentTitle.trim().length > 0) {
    const isTitleDescriptive = documentTitle.length > 5;

    console.log('[PdfRenameDecision] Found document title', {
      title: documentTitle,
      isDescriptive: isTitleDescriptive,
    });

    return {
      shouldRename: true,
      reason: isTitleDescriptive
        ? 'pdf-title-descriptive'
        : 'pdf-title-extracted',
      confidence: 0.95, // High confidence when we have an extracted title
      explanation: `Document has extracted title: "${documentTitle}"`,
    };
  }

  // No title extracted - check if baseline filename is problematic
  console.log('[PdfRenameDecision] No title extracted, checking baseline', {
    baseline: currentFilename,
  });

  const lowerBaseline = currentFilename.toLowerCase();

  // Check for generic/meaningless names
  if (isHashOrUUID(lowerBaseline)) {
    debugLogger.log('[PdfRenameDecision] Baseline is hash/UUID', {
      filename: currentFilename,
    });
    return {
      shouldRename: true,
      reason: 'baseline-hash',
      confidence: 0.9,
      explanation: 'Current filename appears to be a hash or UUID',
    };
  }

  if (isTimestampOnly(lowerBaseline)) {
    debugLogger.log('[PdfRenameDecision] Baseline is timestamp only', {
      filename: currentFilename,
    });
    return {
      shouldRename: true,
      reason: 'baseline-timestamp',
      confidence: 0.85,
      explanation: 'Current filename is timestamp-based only',
    };
  }

  if (isGenericName(lowerBaseline)) {
    debugLogger.log('[PdfRenameDecision] Baseline is generic', {
      filename: currentFilename,
    });
    return {
      shouldRename: true,
      reason: 'baseline-generic',
      confidence: 0.8,
      explanation: 'Current filename is too generic or meaningless',
    };
  }

  // Baseline seems reasonable - don't rename
  debugLogger.log('[PdfRenameDecision] Baseline is already good', {
    filename: currentFilename,
  });

  return {
    shouldRename: false,
    reason: 'already-good',
    confidence: 0.75,
    explanation: 'Current filename appears descriptive enough',
  };
}

/**
 * Check if filename looks like a hash or UUID
 */
function isHashOrUUID(filename: string): boolean {
  // UUID pattern: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  if (
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(
      filename,
    )
  ) {
    return true;
  }

  // Long hex hash (32+ chars)
  if (/^[a-f0-9]{32,}/.test(filename)) {
    return true;
  }

  // Common hash filenames like "2405.19261v2" (arXiv paper IDs)
  // These are actually useful, so DON'T treat as hash
  if (/^\d+\.\d+/.test(filename)) {
    return false;
  }

  return false;
}

/**
 * Check if filename is timestamp only (no descriptive content)
 */
function isTimestampOnly(filename: string): boolean {
  // Remove common extensions
  const nameWithoutExt = filename.replace(/\.(pdf|doc|txt|docx)$/i, '');

  // Patterns like: "2025-10-18", "2025-10-18-12-30", etc
  const timestampPattern =
    /^\d{4}-\d{2}-\d{2}(-\d{2}){0,3}$|^\d{8}T\d{6}|^\d{4}_\d{2}_\d{2}/;

  if (timestampPattern.test(nameWithoutExt)) {
    return true;
  }

  // Unix timestamp: 10+ digits
  if (/^\d{10,}$/.test(nameWithoutExt)) {
    return true;
  }

  return false;
}

/**
 * Check if filename is too generic to be useful
 */
function isGenericName(filename: string): boolean {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.(pdf|doc|txt|docx)$/i, '');
  const lower = nameWithoutExt.toLowerCase();

  // Generic single words
  const genericWords = [
    'document',
    'file',
    'download',
    'unnamed',
    'untitled',
    'new',
    'copy',
    'archive',
  ];

  if (
    genericWords.includes(lower) ||
    genericWords.some((w) => lower.startsWith(`${w}-`))
  ) {
    return true;
  }

  // Very short names (< 3 chars) that aren't meaningful
  if (nameWithoutExt.length < 3 && !/^[a-z]{2,}$/i.test(nameWithoutExt)) {
    return true;
  }

  return false;
}
