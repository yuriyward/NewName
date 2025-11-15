/**
 * PDF renderer public API with file validation
 * Exports main entry point for rendering PDF files to images
 */

import { offscreenLogger } from '@/entrypoints/shared/debug/offscreen-logger';
import type { MuPdfModule } from '@/entrypoints/shared/integrations/mupdf/mupdf-loader';
import { getMuPdfModule } from '@/entrypoints/shared/integrations/mupdf/mupdf-loader';
import {
  FIRST_PAGE_INDEX,
  MAX_PDF_PAGES,
  PDF_RENDER_SCALE,
  PDF_RENDER_TIMEOUT_MS,
} from './constants';
import { canvasToBlob } from './pdf-canvas-utils';
import { renderPageToCanvas } from './pdf-page-renderer';
import type { PdfPageExtractionError, RenderedPdfPage } from './types';

/**
 * Success result for PDF rendering
 */
export interface RenderPdfPagesSuccess {
  success: true;
  pages: RenderedPdfPage[];
  totalPages: number;
  totalTimeMs: number;
}

/**
 * Error result for PDF rendering
 */
export interface RenderPdfPagesError {
  success: false;
  error: string;
  errorType: PdfPageExtractionError['errorType'];
}

export type RenderPdfPagesResult = RenderPdfPagesSuccess | RenderPdfPagesError;

/**
 * Internal: Extract and render specific pages from PDF
 * Orchestrates page rendering with timeout handling
 * @param arrayBuffer - ArrayBuffer containing PDF data
 * @param pageIndices - Array of page indices (0-based) to extract
 * @param mupdf - MuPDF module
 * @returns Array of rendered page data or null on error
 */
async function extractPdfPages(
  arrayBuffer: ArrayBuffer,
  pageIndices: number[],
  mupdf: MuPdfModule,
): Promise<RenderedPdfPage[] | null> {
  const results: RenderedPdfPage[] = [];

  let document: ReturnType<MuPdfModule['Document']['openDocument']> | null =
    null;

  try {
    document = mupdf.Document.openDocument(arrayBuffer, 'application/pdf');

    if (!document) {
      offscreenLogger.warn('[PdfRenderer] Failed to open PDF document');
      return null;
    }

    const numPages = document.countPages();

    for (const pageIndex of pageIndices) {
      if (pageIndex >= numPages) {
        continue;
      }

      const startTime = performance.now();

      try {
        // Wrap in timeout promise
        const renderPromise = renderPageToCanvas(
          arrayBuffer,
          pageIndex,
          PDF_RENDER_SCALE,
          mupdf,
        );

        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<null>((_, reject) => {
          timeoutId = setTimeout(
            () =>
              reject(new Error(`Page render timeout for page ${pageIndex}`)),
            PDF_RENDER_TIMEOUT_MS,
          );
        });

        const canvas = await (async () => {
          try {
            return await Promise.race([renderPromise, timeoutPromise]);
          } finally {
            if (timeoutId !== undefined) {
              clearTimeout(timeoutId);
            }
          }
        })();

        if (!canvas) {
          offscreenLogger.warn('[PdfRenderer] Failed to render page', {
            pageIndex,
          });
          continue;
        }

        const blob = await canvasToBlob(canvas);
        if (!blob) {
          offscreenLogger.warn(
            '[PdfRenderer] Failed to convert page canvas to blob',
            {
              pageIndex,
            },
          );
          continue;
        }

        const renderTimeMs = Math.round(performance.now() - startTime);

        results.push({
          pageNumber: pageIndex + 1, // Return 1-based page number
          blob,
          width: canvas.width,
          height: canvas.height,
          renderTimeMs,
        });
      } catch (error) {
        offscreenLogger.warn('[PdfRenderer] Failed to extract page', {
          pageIndex,
          error,
        });
        // Continue to next page on error
      }
    }
  } catch (error) {
    offscreenLogger.warn('[PdfRenderer] Failed to extract pages', { error });
    return null;
  } finally {
    document?.destroy();
  }

  return results.length > 0 ? results : null;
}

/**
 * Extract pages from PDF and render as PNG blobs
 * @param file - PDF file to process
 * @returns Object with extracted pages or error
 */
export async function renderPdfPages(
  file: File,
): Promise<RenderPdfPagesResult> {
  const totalStartTime = performance.now();

  try {
    // Validate file
    const mimeType = (file.type ?? '').toLowerCase();
    const filenameLower = file.name.toLowerCase();
    const isPdf =
      (mimeType.includes('pdf') && mimeType.length > 0) ||
      filenameLower.endsWith('.pdf');

    if (!isPdf) {
      return {
        success: false,
        error: 'File is not a PDF',
        errorType: 'invalid-pdf',
      };
    }

    if (file.size === 0) {
      return {
        success: false,
        error: 'PDF file is empty',
        errorType: 'invalid-pdf',
      };
    }

    // Quick magic-byte validation before engaging MuPDF
    const headerSlice = await file.slice(0, 5).arrayBuffer();
    const header = new TextDecoder().decode(headerSlice);
    if (!header.startsWith('%PDF-')) {
      return {
        success: false,
        error: 'Invalid PDF file (missing magic bytes)',
        errorType: 'invalid-pdf',
      };
    }

    // Get MuPDF module
    const mupdf = await getMuPdfModule();

    // Load PDF data
    const arrayBuffer = await file.arrayBuffer();

    // Open and validate PDF
    const document = mupdf.Document.openDocument(
      arrayBuffer,
      'application/pdf',
    );
    if (!document) {
      return {
        success: false,
        error: 'Failed to open PDF document',
        errorType: 'invalid-pdf',
      };
    }

    const numPages = document.countPages();

    document.destroy();

    // Determine which pages to extract (first N pages)
    const maxPagesToExtract = Math.min(MAX_PDF_PAGES, numPages);
    const pageIndices = Array.from(
      { length: maxPagesToExtract },
      (_, i) => FIRST_PAGE_INDEX + i,
    );

    // Extract pages
    const pages = await extractPdfPages(arrayBuffer, pageIndices, mupdf);
    if (!pages || pages.length === 0) {
      return {
        success: false,
        error: 'Failed to extract pages from PDF',
        errorType: 'render-failed',
      };
    }

    const totalTimeMs = Math.round(performance.now() - totalStartTime);

    if (offscreenLogger.isEnabled()) {
      offscreenLogger.log('[PdfRenderer] PDF extraction complete', {
        pagesExtracted: pages.length,
        totalPages: numPages,
        totalTimeMs,
      });
    }

    return {
      success: true,
      pages,
      totalPages: numPages,
      totalTimeMs,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    offscreenLogger.error('[PdfRenderer] PDF extraction failed', { error });

    return {
      success: false,
      error: errorMsg,
      errorType: 'unknown',
    };
  }
}
