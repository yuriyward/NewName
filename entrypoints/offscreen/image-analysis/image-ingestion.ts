/**
 * Image ingestion utilities for preparing images for Prompt API analysis
 * Handles file reading, ImageBitmap creation, downscaling, and PNG encoding
 */

import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  IMAGE_ANALYSIS_FORMAT,
  MAX_IMAGE_EDGE_PX,
  MAX_IMAGE_FILE_SIZE_BYTES,
  MIN_IMAGE_DIMENSION_PX,
} from '@/entrypoints/shared/integrations/image-analysis/constants';

export interface ImageIngestionSuccess {
  success: true;
  blob: Blob;
  mimeType: string;
  originalWidth: number;
  originalHeight: number;
  resizedWidth: number;
  resizedHeight: number;
  resizeRatio: number;
  originalSizeBytes: number;
  elapsedMs: number;
}

export interface ImageIngestionError {
  success: false;
  error: string;
  errorType:
    | 'file-not-found'
    | 'file-too-large'
    | 'invalid-image'
    | 'decode-failed'
    | 'resize-failed'
    | 'permission-denied'
    | 'unknown';
}

export type ImageIngestionOutput = ImageIngestionSuccess | ImageIngestionError;

/**
 * Create an ImageBitmap from a Blob
 * @param blob - Image blob to decode
 * @returns ImageBitmap or error
 */
async function createBitmapFromBlob(blob: Blob): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(blob);
  } catch (error) {
    debugLogger.warn('[ImageIngestion] Failed to create ImageBitmap', {
      error,
      mimeType: blob.type,
      size: blob.size,
    });
    return null;
  }
}

/**
 * Calculate resize ratio to fit image within max dimensions
 * Maintains aspect ratio, only downscales if needed
 *
 * @param width - Original width
 * @param height - Original height
 * @returns Resize ratio (0.0-1.0), where 1.0 means no resize needed
 */
function calculateResizeRatio(width: number, height: number): number {
  const maxDimension = Math.max(width, height);
  if (maxDimension <= MAX_IMAGE_EDGE_PX) {
    return 1.0; // No resize needed
  }
  return Math.max(0.1, MAX_IMAGE_EDGE_PX / maxDimension);
}

/**
 * Downscale ImageBitmap to fit within max edge dimensions and encode to PNG
 *
 * @param bitmap - ImageBitmap to downscale
 * @returns PNG blob or null on error
 */
async function downscaleAndEncodeImage(
  bitmap: ImageBitmap,
): Promise<Blob | null> {
  try {
    const resizeRatio = calculateResizeRatio(bitmap.width, bitmap.height);
    const targetWidth = Math.round(bitmap.width * resizeRatio);
    const targetHeight = Math.round(bitmap.height * resizeRatio);

    // If no resize needed, directly encode bitmap to PNG
    if (resizeRatio === 1.0) {
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        debugLogger.warn('[ImageIngestion] Failed to get canvas context');
        return null;
      }
      ctx.drawImage(bitmap, 0, 0);
      return await canvas.convertToBlob({ type: IMAGE_ANALYSIS_FORMAT });
    }

    // Downscale to target dimensions
    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      debugLogger.warn(
        '[ImageIngestion] Failed to get canvas context for resizing',
      );
      return null;
    }

    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    const pngBlob = await canvas.convertToBlob({
      type: IMAGE_ANALYSIS_FORMAT,
    });

    console.log('[ImageIngestion] Downscaling complete', {
      originalDimensions: `${bitmap.width}x${bitmap.height}`,
      resizedDimensions: `${targetWidth}x${targetHeight}`,
      resizeRatio: resizeRatio.toFixed(2),
      originalSize: bitmap.width * bitmap.height,
      resizedSize: targetWidth * targetHeight,
      pngSize: pngBlob.size,
    });

    return pngBlob;
  } catch (error) {
    debugLogger.warn('[ImageIngestion] Failed to downscale and encode image', {
      error,
      originalWidth: bitmap.width,
      originalHeight: bitmap.height,
    });
    return null;
  }
}

/**
 * Ingest an image file for Prompt API analysis
 * Handles reading, validation, downscaling, and PNG encoding
 *
 * @param fileHandle - FileSystemFileHandle to read
 * @returns Ingestion result with encoded PNG blob and metadata
 *
 * @example
 * const result = await ingestImageForPrompt(imageHandle);
 * if (result.success) {
 *   const blob = result.blob; // PNG blob ready for Prompt API
 *   console.log(`Original: ${result.originalWidth}x${result.originalHeight}`);
 *   console.log(`Resized: ${result.resizedWidth}x${result.resizedHeight}`);
 * }
 */
export async function ingestImageForPrompt(
  fileHandle: FileSystemFileHandle,
): Promise<ImageIngestionOutput> {
  const startedAt = performance.now();

  try {
    // Get file and check size
    const file = await fileHandle.getFile();
    const fileSizeBytes = file.size;

    if (fileSizeBytes === 0) {
      return {
        success: false,
        error: 'Image file is empty',
        errorType: 'invalid-image',
      };
    }

    if (fileSizeBytes > MAX_IMAGE_FILE_SIZE_BYTES) {
      return {
        success: false,
        error: `Image file too large (${(fileSizeBytes / 1024 / 1024).toFixed(1)}MB, max ${MAX_IMAGE_FILE_SIZE_BYTES / 1024 / 1024}MB)`,
        errorType: 'file-too-large',
      };
    }

    // Read file as blob (already in memory via File API)
    const fileBlob = file.slice(0, fileSizeBytes);

    // Create ImageBitmap to validate image and get dimensions
    console.log('[ImageIngestion] Creating ImageBitmap from file', {
      filename: fileHandle.name,
      size: fileSizeBytes,
      type: file.type,
    });

    const bitmap = await createBitmapFromBlob(fileBlob);
    if (!bitmap) {
      return {
        success: false,
        error: 'Failed to decode image - invalid or corrupted format',
        errorType: 'decode-failed',
      };
    }

    // Validate dimensions
    if (
      bitmap.width < MIN_IMAGE_DIMENSION_PX ||
      bitmap.height < MIN_IMAGE_DIMENSION_PX
    ) {
      return {
        success: false,
        error: `Image dimensions too small (${bitmap.width}x${bitmap.height}px, minimum ${MIN_IMAGE_DIMENSION_PX}px)`,
        errorType: 'invalid-image',
      };
    }

    const originalWidth = bitmap.width;
    const originalHeight = bitmap.height;
    const resizeRatio = calculateResizeRatio(originalWidth, originalHeight);

    // Downscale and encode to PNG
    const pngBlob = await downscaleAndEncodeImage(bitmap);
    if (!pngBlob) {
      return {
        success: false,
        error: 'Failed to encode image to PNG',
        errorType: 'resize-failed',
      };
    }

    // Create another bitmap from the PNG to get actual resized dimensions
    const resizedBitmap = await createBitmapFromBlob(pngBlob);
    const resizedWidth = resizedBitmap?.width ?? originalWidth;
    const resizedHeight = resizedBitmap?.height ?? originalHeight;

    const elapsedMs = Math.round(performance.now() - startedAt);

    console.log('[ImageIngestion] Image ingestion successful', {
      filename: fileHandle.name,
      originalSize: `${originalWidth}x${originalHeight}`,
      resizedSize: `${resizedWidth}x${resizedHeight}`,
      resizeRatio: resizeRatio.toFixed(2),
      pngSize: pngBlob.size,
      elapsedMs,
    });

    return {
      success: true,
      blob: pngBlob,
      mimeType: IMAGE_ANALYSIS_FORMAT,
      originalWidth,
      originalHeight,
      resizedWidth,
      resizedHeight,
      resizeRatio,
      originalSizeBytes: fileSizeBytes,
      elapsedMs,
    };
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - startedAt);
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown error during image ingestion';

    debugLogger.error('[ImageIngestion] Image ingestion failed', {
      error,
      elapsedMs,
    });

    return {
      success: false,
      error: errorMessage,
      errorType:
        error instanceof DOMException ? 'permission-denied' : 'unknown',
    };
  }
}
