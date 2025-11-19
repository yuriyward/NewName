/**
 * PDF page extraction and preparation for image analysis
 * High-level coordinator that combines rendering and preparation stages
 *
 * Lower-level rendering pipeline:
 * - pdf-page-renderer.ts: Core MuPDF rendering (document → pixmap → canvas)
 * - pdf-canvas-utils.ts: Canvas conversion (canvas → PNG blob)
 * - Internal extractPdfPages: Orchestrates page rendering with timeouts
 */

import { offscreenLogger } from '@/entrypoints/shared/debug/offscreen-logger';
import { type RenderPdfPagesResult, renderPdfPages } from './pdf-renderer';

/**
 * Extracted page prepared for image analysis
 */
export interface ExtractedPageForAnalysis {
  pageNumber: number;
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Result of extracting and preparing PDF pages for image analysis
 */
export interface PdfPagePreparationResult {
  success: true;
  pages: ExtractedPageForAnalysis[];
  totalPages: number;
  totalTimeMs: number;
}

/**
 * Error during PDF page extraction
 */
export interface PdfPagePreparationError {
  success: false;
  error: string;
  errorType:
    | 'file-not-found'
    | 'file-too-large'
    | 'invalid-pdf'
    | 'render-failed'
    | 'permission-denied'
    | 'timeout'
    | 'unknown';
}

export type PdfPagePreparationOutput =
  | PdfPagePreparationResult
  | PdfPagePreparationError;

/**
 * Extract PDF pages for image-based analysis
 * Renders pages 1-2 as PNG blobs and prepares them for image ingestion pipeline
 *
 * @param fileHandle - FileSystemFileHandle for the PDF file
 * @returns Extracted pages or error
 */
export async function extractPdfPagesForAnalysis(
  fileHandle: FileSystemFileHandle,
): Promise<PdfPagePreparationOutput> {
  const startTime = performance.now();

  offscreenLogger.log('[PdfPageExtractor] Starting PDF page extraction', {
    filename: fileHandle.name,
  });

  try {
    // Get file from handle
    const file = await fileHandle.getFile();

    if (file.size === 0) {
      offscreenLogger.log('[PdfPageExtractor] File is empty', {
        filename: fileHandle.name,
      });
      return {
        success: false,
        error: 'PDF file is empty',
        errorType: 'invalid-pdf',
      };
    }

    // Render PDF pages
    const renderResult: RenderPdfPagesResult = await renderPdfPages(file);

    if (!renderResult.success) {
      offscreenLogger.warn('[PdfPageExtractor] PDF rendering failed', {
        filename: fileHandle.name,
        error: renderResult.error,
        errorType: renderResult.errorType,
      });
      return {
        success: false,
        error: renderResult.error,
        errorType: renderResult.errorType,
      };
    }

    // Transform pages for image analysis pipeline
    const preparedPages: ExtractedPageForAnalysis[] = renderResult.pages.map(
      (page) => ({
        pageNumber: page.pageNumber,
        blob: page.blob,
        width: page.width,
        height: page.height,
      }),
    );

    const totalTimeMs = Math.round(performance.now() - startTime);

    return {
      success: true,
      pages: preparedPages,
      totalPages: renderResult.totalPages,
      totalTimeMs,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const elapsedMs = Math.round(performance.now() - startTime);
    offscreenLogger.error('[PdfPageExtractor] PDF extraction failed', {
      filename: fileHandle.name,
      error: errorMsg,
      elapsedMs,
    });

    return {
      success: false,
      error: errorMsg,
      errorType: 'unknown',
    };
  }
}
