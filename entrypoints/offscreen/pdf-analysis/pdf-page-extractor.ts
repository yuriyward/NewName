/**
 * PDF page extraction and preparation for image analysis
 * Extracts PDF pages as images and prepares them for the image analysis pipeline
 */

import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { logPdfDebug } from './logging';
import { renderPdfPages } from './pdf-renderer';

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

  debugLogger.log('[PdfPageExtractor] Starting PDF page extraction', {
    filename: fileHandle.name,
  });
  logPdfDebug('extract-start', { filename: fileHandle.name });

  try {
    // Get file from handle
    debugLogger.log('[PdfPageExtractor] Getting file from handle', {
      filename: fileHandle.name,
    });
    const file = await fileHandle.getFile();

    debugLogger.log('[PdfPageExtractor] File obtained', {
      filename: fileHandle.name,
      fileSize: file.size,
      mimeType: file.type,
    });
    logPdfDebug('extract-file', {
      filename: fileHandle.name,
      sizeBytes: file.size,
      mimeType: file.type || null,
    });

    if (file.size === 0) {
      debugLogger.log('[PdfPageExtractor] File is empty', {
        filename: fileHandle.name,
      });
      logPdfDebug('extract-error', {
        filename: fileHandle.name,
        reason: 'empty-file',
      });
      return {
        success: false,
        error: 'PDF file is empty',
        errorType: 'invalid-pdf',
      };
    }

    // Render PDF pages
    debugLogger.log('[PdfPageExtractor] Calling renderPdfPages', {
      filename: fileHandle.name,
      fileSize: file.size,
    });
    const renderResult = await renderPdfPages(file);
    logPdfDebug('render-call-complete', {
      filename: fileHandle.name,
      success: renderResult.success,
      pages: renderResult.success ? renderResult.pages.length : 0,
      errorType: renderResult.success ? undefined : renderResult.errorType,
    });

    debugLogger.log('[PdfPageExtractor] Render result received', {
      filename: fileHandle.name,
      renderSuccess: renderResult.success,
      errorType: !renderResult.success ? renderResult.errorType : undefined,
      pagesCount: renderResult.success ? renderResult.pages?.length : undefined,
    });

    if (!renderResult.success) {
      debugLogger.warn('[PdfPageExtractor] PDF rendering failed', {
        filename: fileHandle.name,
        error: renderResult.error,
        errorType: renderResult.errorType,
      });
      logPdfDebug('extract-error', {
        filename: fileHandle.name,
        reason: 'render-failed',
        error: renderResult.error,
        errorType: renderResult.errorType,
      });
      return {
        success: false,
        error: renderResult.error,
        errorType: renderResult.errorType as any,
      };
    }

    // Transform pages for image analysis pipeline
    debugLogger.log('[PdfPageExtractor] Transforming rendered pages', {
      filename: fileHandle.name,
      pageCount: renderResult.pages.length,
    });
    logPdfDebug('extract-transform', {
      filename: fileHandle.name,
      pageCount: renderResult.pages.length,
    });
    const preparedPages: ExtractedPageForAnalysis[] = renderResult.pages.map(
      (page: any) => ({
        pageNumber: page.pageNumber,
        blob: page.blob,
        width: page.width,
        height: page.height,
      }),
    );

    const totalTimeMs = Math.round(performance.now() - startTime);

    debugLogger.log('[PdfPageExtractor] PDF extraction complete', {
      filename: fileHandle.name,
      pagesExtracted: preparedPages.length,
      totalPages: renderResult.totalPages,
      totalTimeMs,
    });
    logPdfDebug('extract-complete', {
      filename: fileHandle.name,
      pagesExtracted: preparedPages.length,
      totalPages: renderResult.totalPages,
      totalTimeMs,
    });

    return {
      success: true,
      pages: preparedPages,
      totalPages: renderResult.totalPages,
      totalTimeMs,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const elapsedMs = Math.round(performance.now() - startTime);
    debugLogger.error('[PdfPageExtractor] PDF extraction failed', {
      filename: fileHandle.name,
      error: errorMsg,
      elapsedMs,
    });
    logPdfDebug('extract-error', {
      filename: fileHandle.name,
      reason: 'exception',
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
