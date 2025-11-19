/**
 * Core PDF page rendering to OffscreenCanvas
 * Handles MuPDF rendering pipeline: document → page → pixmap → PNG → canvas
 */

import { offscreenLogger } from '@/entrypoints/shared/debug/offscreen-logger';
import type { MuPdfModule } from '@/entrypoints/shared/integrations/mupdf/mupdf-loader';
import { PDF_PAGE_IMAGE_FORMAT } from './constants';

/**
 * Render a single PDF page to OffscreenCanvas at specified scale
 * @param arrayBuffer - ArrayBuffer containing PDF data
 * @param pageIndex - Page index to render (0-based)
 * @param scale - Render scale factor
 * @param mupdf - MuPDF module
 * @returns Canvas element with rendered page, or null on error
 */
export async function renderPageToCanvas(
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
      offscreenLogger.warn('[PdfRenderer] Failed to open PDF document');
      return null;
    }

    // Get total pages
    const numPages = document.countPages();
    if (pageIndex >= numPages) {
      offscreenLogger.warn('[PdfRenderer] Page index exceeds PDF page count', {
        pageIndex,
        totalPages: numPages,
      });
      document.destroy();
      return null;
    }

    // Load and render the page
    const page = document.loadPage(pageIndex);
    if (!page) {
      offscreenLogger.warn('[PdfRenderer] Failed to load page', { pageIndex });
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
      offscreenLogger.warn('[PdfRenderer] Failed to create pixmap', {
        pageIndex,
      });
      page.destroy();
      document.destroy();
      return null;
    }

    // Get PNG data from pixmap
    const pngData = pixmap.asPNG();
    if (!pngData) {
      offscreenLogger.warn('[PdfRenderer] Failed to convert pixmap to PNG', {
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
    let imageBitmap: ImageBitmap | null = null;
    try {
      imageBitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        offscreenLogger.warn('[PdfRenderer] Failed to get canvas context');
        pixmap.destroy();
        page.destroy();
        document.destroy();
        return null;
      }

      ctx.drawImage(imageBitmap, 0, 0);

      // Clean up
      pixmap.destroy();
      page.destroy();
      document.destroy();

      return canvas;
    } finally {
      imageBitmap?.close();
    }
  } catch (error) {
    offscreenLogger.warn('[PdfRenderer] Failed to render page to canvas', {
      error,
    });
    return null;
  }
}
