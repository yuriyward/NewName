/**
 * Canvas conversion utilities for PDF rendering
 * Converts OffscreenCanvas to PNG blobs with quality settings
 */

import { offscreenLogger } from '@/entrypoints/shared/debug/offscreen-logger';
import { PDF_PAGE_IMAGE_FORMAT, PDF_PNG_QUALITY } from './constants';

/**
 * Convert OffscreenCanvas to PNG blob
 * @param canvas - OffscreenCanvas to convert
 * @returns PNG blob or null on error
 */
export async function canvasToBlob(
  canvas: OffscreenCanvas,
): Promise<Blob | null> {
  try {
    return await canvas.convertToBlob({
      type: PDF_PAGE_IMAGE_FORMAT,
      quality: PDF_PNG_QUALITY,
    });
  } catch (error) {
    offscreenLogger.warn('[PdfRenderer] Failed to convert canvas to blob', {
      error,
    });
    return null;
  }
}
