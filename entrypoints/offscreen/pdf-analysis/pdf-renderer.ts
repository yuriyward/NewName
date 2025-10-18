/**
 * PDF page rendering utilities using MuPDF WASM
 * Converts PDF pages to canvas and encodes as PNG
 */

import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type { MuPdfModule } from '@/entrypoints/shared/integrations/mupdf/mupdf-loader';
import { getMuPdfModule } from '@/entrypoints/shared/integrations/mupdf/mupdf-loader';
import {
  FIRST_PAGE_INDEX,
  MAX_PDF_PAGES,
  PDF_PAGE_IMAGE_FORMAT,
  PDF_RENDER_SCALE,
  PDF_RENDER_TIMEOUT_MS,
} from './constants';
import { logPdfDebug } from './logging';
import type { PdfPageExtractionError, RenderedPdfPage } from './types';

/**
 * Render a single PDF page to OffscreenCanvas at specified scale
 * @param arrayBuffer - ArrayBuffer containing PDF data
 * @param pageIndex - Page index to render (0-based)
 * @param scale - Render scale factor
 * @param mupdf - MuPDF module
 * @returns Canvas element with rendered page, or null on error
 */
async function renderPageToCanvas(
  arrayBuffer: ArrayBuffer,
  pageIndex: number,
  scale: number,
  mupdf: MuPdfModule,
): Promise<OffscreenCanvas | null> {
  try {
    // Load PDF document
    const document = mupdf.Document.openDocument(
      arrayBuffer,
      'application/pdf',
    );
    if (!document) {
      debugLogger.warn('[PdfRenderer] Failed to open PDF document');
      return null;
    }

    // Get total pages
    const numPages = document.countPages();
    if (pageIndex >= numPages) {
      debugLogger.warn('[PdfRenderer] Page index exceeds PDF page count', {
        pageIndex,
        totalPages: numPages,
      });
      document.destroy();
      return null;
    }

    // Load and render the page
    const page = document.loadPage(pageIndex);
    if (!page) {
      debugLogger.warn('[PdfRenderer] Failed to load page', { pageIndex });
      document.destroy();
      return null;
    }

    // Create pixmap for rendering with scaling matrix
    const scaledMatrix = mupdf.Matrix.scale(scale, scale);
    const pixmap = page.toPixmap(
      scaledMatrix,
      mupdf.ColorSpace.DeviceRGB,
      false,
      true,
    );

    if (!pixmap) {
      debugLogger.warn('[PdfRenderer] Failed to create pixmap', { pageIndex });
      page.destroy();
      document.destroy();
      return null;
    }

    // Get PNG data from pixmap
    const pngData = pixmap.asPNG();
    if (!pngData) {
      debugLogger.warn('[PdfRenderer] Failed to convert pixmap to PNG', {
        pageIndex,
      });
      pixmap.destroy();
      page.destroy();
      document.destroy();
      return null;
    }

    // Create blob from PNG data
    const pngBuffer = new Uint8Array(pngData.length);
    pngBuffer.set(pngData);
    const blob = new Blob([pngBuffer.buffer], { type: PDF_PAGE_IMAGE_FORMAT });

    // Create OffscreenCanvas from PNG blob
    // We need to decode the PNG to get dimensions
    const imageBitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      debugLogger.warn('[PdfRenderer] Failed to get canvas context');
      imageBitmap.close();
      pixmap.destroy();
      page.destroy();
      document.destroy();
      return null;
    }

    ctx.drawImage(imageBitmap, 0, 0);
    imageBitmap.close();

    // Clean up
    pixmap.destroy();
    page.destroy();
    document.destroy();

    return canvas;
  } catch (error) {
    debugLogger.warn('[PdfRenderer] Failed to render page to canvas', {
      error,
    });
    logPdfDebug('page-render-error', {
      stage: 'render',
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Convert OffscreenCanvas to PNG blob
 * @param canvas - OffscreenCanvas to convert
 * @returns PNG blob or null on error
 */
async function canvasToBlob(canvas: OffscreenCanvas): Promise<Blob | null> {
  try {
    return await canvas.convertToBlob({
      type: PDF_PAGE_IMAGE_FORMAT,
      quality: 0.95,
    });
  } catch (error) {
    debugLogger.warn('[PdfRenderer] Failed to convert canvas to blob', {
      error,
    });
    logPdfDebug('page-render-error', {
      stage: 'blob',
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Extract and render specific pages from PDF
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

  try {
    const document = mupdf.Document.openDocument(
      arrayBuffer,
      'application/pdf',
    );

    if (!document) {
      debugLogger.warn('[PdfRenderer] Failed to open PDF document');
      return null;
    }

    const numPages = document.countPages();

    for (const pageIndex of pageIndices) {
      logPdfDebug('page-render-start', {
        pageIndex,
        totalPages: numPages,
      });

      if (pageIndex >= numPages) {
        logPdfDebug('page-render-skip', {
          pageIndex,
          reason: 'out-of-range',
          totalPages: numPages,
        });
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
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(
            () => reject(new Error('Page render timeout')),
            PDF_RENDER_TIMEOUT_MS,
          ),
        );

        const canvas = await Promise.race([renderPromise, timeoutPromise]);

        if (!canvas) {
          debugLogger.warn('[PdfRenderer] Failed to render page', {
            pageIndex,
          });
          logPdfDebug('page-render-error', {
            stage: 'render-canvas',
            pageIndex,
          });
          continue;
        }

        const blob = await canvasToBlob(canvas);
        if (!blob) {
          debugLogger.warn(
            '[PdfRenderer] Failed to convert page canvas to blob',
            {
              pageIndex,
            },
          );
          logPdfDebug('page-render-error', {
            stage: 'render-blob',
            pageIndex,
          });
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

        logPdfDebug('page-render-complete', {
          pageIndex,
          pageNumber: pageIndex + 1,
          width: canvas.width,
          height: canvas.height,
          renderTimeMs,
          blobSize: blob.size,
        });
      } catch (error) {
        debugLogger.warn('[PdfRenderer] Failed to extract page', {
          pageIndex,
          error,
        });
        logPdfDebug('page-render-error', {
          stage: 'extract',
          pageIndex,
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue to next page on error
      }
    }

    document.destroy();
  } catch (error) {
    debugLogger.warn('[PdfRenderer] Failed to extract pages', { error });
    return null;
  }

  return results.length > 0 ? results : null;
}

/**
 * Extract pages from PDF and render as PNG blobs
 * @param file - PDF file to process
 * @returns Object with extracted pages or error
 */
export interface RenderPdfPagesSuccess {
  success: true;
  pages: RenderedPdfPage[];
  totalPages: number;
  totalTimeMs: number;
}

export interface RenderPdfPagesError {
  success: false;
  error: string;
  errorType: PdfPageExtractionError['errorType'];
}

export type RenderPdfPagesResult = RenderPdfPagesSuccess | RenderPdfPagesError;

export async function renderPdfPages(
  file: File,
): Promise<RenderPdfPagesResult> {
  const totalStartTime = performance.now();
  logPdfDebug('render-start', {
    filename: file.name,
    sizeBytes: file.size,
    mimeType: file.type || null,
  });

  try {
    // Validate file
    const mimeType = (file.type ?? '').toLowerCase();
    const filenameLower = file.name.toLowerCase();
    const isPdf =
      (mimeType.includes('pdf') && mimeType.length > 0) ||
      filenameLower.endsWith('.pdf');

    if (!isPdf) {
      logPdfDebug('render-error', {
        filename: file.name,
        reason: 'invalid-type',
        mimeType: file.type || null,
      });
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
      logPdfDebug('render-error', {
        filename: file.name,
        reason: 'load-failed',
      });
      return {
        success: false,
        error: 'Failed to open PDF document',
        errorType: 'invalid-pdf',
      };
    }

    const numPages = document.countPages();

    logPdfDebug('render-loaded', {
      filename: file.name,
      totalPages: numPages,
    });

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
      logPdfDebug('render-error', {
        filename: file.name,
        reason: 'no-pages-rendered',
      });
      return {
        success: false,
        error: 'Failed to extract pages from PDF',
        errorType: 'render-failed',
      };
    }

    const totalTimeMs = Math.round(performance.now() - totalStartTime);

    if (debugLogger.isEnabled()) {
      debugLogger.log('[PdfRenderer] PDF extraction complete', {
        pagesExtracted: pages.length,
        totalPages: numPages,
        totalTimeMs,
      });
    }
    logPdfDebug('render-complete', {
      filename: file.name,
      pagesExtracted: pages.length,
      totalPages: numPages,
      totalTimeMs,
    });

    return {
      success: true,
      pages,
      totalPages: numPages,
      totalTimeMs,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    debugLogger.error('[PdfRenderer] PDF extraction failed', { error });
    logPdfDebug('render-error', {
      filename: file.name,
      reason: 'exception',
      error: errorMsg,
    });

    return {
      success: false,
      error: errorMsg,
      errorType: 'unknown',
    };
  }
}
