/**
 * Tests for image-ingestion.ts
 * Tests file reading, validation, resizing, and PNG encoding
 */

import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  IMAGE_ANALYSIS_FORMAT,
  MAX_IMAGE_EDGE_PX,
  MAX_IMAGE_FILE_SIZE_BYTES,
  MIN_DOWNSCALE_RATIO,
  MIN_IMAGE_DIMENSION_PX,
} from '@/entrypoints/shared/integrations/image-analysis/constants';
import { ingestImageForPrompt } from './image-ingestion';

// Mock offscreen logger
vi.mock('@/entrypoints/shared/debug/offscreen-logger', () => ({
  offscreenLogger: {
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    isEnabled: vi.fn().mockReturnValue(true),
    setEnabled: vi.fn(),
  },
}));

let mockConsoleLog: ReturnType<typeof vi.spyOn>;

describe('image-ingestion', () => {
  let mockFileHandle: FileSystemFileHandle;
  let mockFile: File;
  let _mockImageBitmap: ImageBitmap;
  let mockCanvas: OffscreenCanvas;
  let mockContext: OffscreenCanvasRenderingContext2D;
  let mockBlob: Blob;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog?.mockRestore();
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock blob
    mockBlob = new Blob(['fake-png-data'], { type: IMAGE_ANALYSIS_FORMAT });

    // Mock canvas context
    mockContext = {
      drawImage: vi.fn(),
    } as unknown as OffscreenCanvasRenderingContext2D;

    // Mock canvas
    mockCanvas = {
      width: 1024,
      height: 768,
      getContext: vi.fn().mockReturnValue(mockContext),
      convertToBlob: vi.fn().mockResolvedValue(mockBlob),
    } as unknown as OffscreenCanvas;

    // Mock OffscreenCanvas constructor
    const OffscreenCanvasMock = vi
      .fn(function mockOffscreenCanvas(width: number, height: number) {
        mockCanvas.width = width;
        mockCanvas.height = height;
        return mockCanvas;
      })
      .mockName('OffscreenCanvasMock');

    globalThis.OffscreenCanvas =
      OffscreenCanvasMock as unknown as typeof OffscreenCanvas;

    // Mock ImageBitmap
    _mockImageBitmap = {
      width: 1024,
      height: 768,
      close: vi.fn(),
    } as unknown as ImageBitmap;

    // Mock createImageBitmap - returns bitmap matching canvas dimensions
    global.createImageBitmap = vi.fn().mockImplementation(async () => {
      return {
        width: mockCanvas.width,
        height: mockCanvas.height,
        close: vi.fn(),
      } as unknown as ImageBitmap;
    });

    // Mock File - use constructor to set size
    mockFile = new File(['test-data'], 'test.jpg', {
      type: 'image/jpeg',
    });

    // Mock FileSystemFileHandle
    mockFileHandle = {
      name: 'test-image.jpg',
      kind: 'file',
      getFile: vi.fn().mockResolvedValue(mockFile),
    } as unknown as FileSystemFileHandle;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog?.mockRestore();
  });

  describe('Successful ingestion', () => {
    it('successfully ingests a valid image within max dimensions', async () => {
      // Use dimensions within MAX_IMAGE_EDGE_PX (384) so no resize is needed
      const bitmap = {
        width: 300,
        height: 200,
        close: vi.fn(),
      } as unknown as ImageBitmap;
      global.createImageBitmap = vi.fn().mockResolvedValue(bitmap);

      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.blob).toBe(mockBlob);
      expect(result.mimeType).toBe(IMAGE_ANALYSIS_FORMAT);
      expect(result.originalWidth).toBe(300);
      expect(result.originalHeight).toBe(200);
      expect(result.resizedWidth).toBe(300);
      expect(result.resizedHeight).toBe(200);
      expect(result.resizeRatio).toBe(1.0); // No resize needed
      expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    });

    it('successfully ingests a small image', async () => {
      // 256x192 is within the 384px limit
      const bitmap = {
        width: 256,
        height: 192,
        close: vi.fn(),
      } as unknown as ImageBitmap;
      global.createImageBitmap = vi.fn().mockResolvedValue(bitmap);

      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.originalWidth).toBe(256);
      expect(result.originalHeight).toBe(192);
      expect(result.resizeRatio).toBe(1.0); // No resize needed
    });

    it('downscales image that exceeds max edge dimensions', async () => {
      // Image larger than MAX_IMAGE_EDGE_PX
      const largeBitmap = {
        width: 3000,
        height: 2000,
        close: vi.fn(),
      } as unknown as ImageBitmap;

      global.createImageBitmap = vi
        .fn()
        .mockResolvedValueOnce(largeBitmap) // First call for initial bitmap
        .mockImplementation(async () => {
          // Second call returns resized bitmap
          return {
            width: mockCanvas.width,
            height: mockCanvas.height,
            close: vi.fn(),
          } as unknown as ImageBitmap;
        });

      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.originalWidth).toBe(3000);
      expect(result.originalHeight).toBe(2000);
      expect(result.resizeRatio).toBeLessThan(1.0);
      expect(result.resizeRatio).toBeCloseTo(MAX_IMAGE_EDGE_PX / 3000, 2);

      // Verify canvas was created with correct dimensions
      const expectedWidth = Math.round(3000 * result.resizeRatio);
      const expectedHeight = Math.round(2000 * result.resizeRatio);
      expect(mockCanvas.width).toBe(expectedWidth);
      expect(mockCanvas.height).toBe(expectedHeight);
    });

    it('maintains aspect ratio when downscaling', async () => {
      const largeBitmap = {
        width: 4000,
        height: 3000,
        close: vi.fn(),
      } as unknown as ImageBitmap;

      global.createImageBitmap = vi
        .fn()
        .mockResolvedValueOnce(largeBitmap)
        .mockImplementation(async () => {
          return {
            width: mockCanvas.width,
            height: mockCanvas.height,
            close: vi.fn(),
          } as unknown as ImageBitmap;
        });

      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const originalAspect = 4000 / 3000;
      const resizedAspect = result.resizedWidth / result.resizedHeight;
      expect(resizedAspect).toBeCloseTo(originalAspect, 2);
    });

    it('encodes image to PNG format', async () => {
      await ingestImageForPrompt(mockFileHandle);

      expect(mockCanvas.convertToBlob).toHaveBeenCalledWith({
        type: IMAGE_ANALYSIS_FORMAT,
      });
    });
  });

  describe('File validation', () => {
    it('rejects empty file', async () => {
      const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });
      (mockFileHandle.getFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        emptyFile,
      );

      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.errorType).toBe('invalid-image');
      expect(result.error).toContain('empty');
    });

    it('rejects file larger than max size', async () => {
      // Mock a file with size property set directly instead of creating huge data
      const largeFile = {
        size: MAX_IMAGE_FILE_SIZE_BYTES + 1,
        type: 'image/jpeg',
        name: 'large.jpg',
        slice: () => new Blob(['fake']),
      } as unknown as File;

      (mockFileHandle.getFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        largeFile,
      );

      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.errorType).toBe('file-too-large');
      expect(result.error).toContain('too large');
    });

    it('accepts file at exact max size', async () => {
      // Mock a file at exact max size
      const maxFile = {
        size: MAX_IMAGE_FILE_SIZE_BYTES,
        type: 'image/jpeg',
        name: 'max.jpg',
        slice: () => new Blob(['fake']),
      } as unknown as File;

      (mockFileHandle.getFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        maxFile,
      );

      // Mock successful bitmap creation for this size
      const bitmap = {
        width: 1024,
        height: 768,
        close: vi.fn(),
      } as unknown as ImageBitmap;
      global.createImageBitmap = vi.fn().mockResolvedValue(bitmap);

      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(true);
    });
  });

  describe('Image decode validation', () => {
    it('rejects invalid image that fails to decode', async () => {
      (
        global.createImageBitmap as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(new Error('Invalid image format'));

      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.errorType).toBe('decode-failed');
      expect(result.error).toContain('decode');
    });

    it('rejects corrupted image', async () => {
      (
        global.createImageBitmap as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.errorType).toBe('decode-failed');
      expect(result.error).toContain('invalid or corrupted');
    });
  });

  describe('Dimension validation', () => {
    it('rejects image with width below minimum', async () => {
      global.createImageBitmap = vi.fn().mockResolvedValue({
        width: MIN_IMAGE_DIMENSION_PX - 1,
        height: 1024,
        close: vi.fn(),
      } as unknown as ImageBitmap);

      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.errorType).toBe('invalid-image');
      expect(result.error).toContain('too small');
      expect(result.error).toContain(`${MIN_IMAGE_DIMENSION_PX - 1}x1024`);
    });

    it('rejects image with height below minimum', async () => {
      global.createImageBitmap = vi.fn().mockResolvedValue({
        width: 1024,
        height: MIN_IMAGE_DIMENSION_PX - 1,
        close: vi.fn(),
      } as unknown as ImageBitmap);

      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.errorType).toBe('invalid-image');
      expect(result.error).toContain('too small');
    });

    it('accepts image at exact minimum dimensions', async () => {
      global.createImageBitmap = vi.fn().mockResolvedValue({
        width: MIN_IMAGE_DIMENSION_PX,
        height: MIN_IMAGE_DIMENSION_PX,
        close: vi.fn(),
      } as unknown as ImageBitmap);

      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(true);
    });
  });

  describe('Resize and encoding failures', () => {
    it('handles canvas context creation failure', async () => {
      mockCanvas.getContext = vi.fn().mockReturnValue(null);

      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.errorType).toBe('resize-failed');
      expect(result.error).toContain('encode');
    });

    it('handles convertToBlob failure', async () => {
      mockCanvas.convertToBlob = vi
        .fn()
        .mockRejectedValue(new Error('Encoding failed'));

      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.errorType).toBe('resize-failed');
      expect(result.error).toContain('encode');
    });
  });

  describe('Permission and error handling', () => {
    it('handles permission denied error', async () => {
      (mockFileHandle.getFile as ReturnType<typeof vi.fn>).mockRejectedValue(
        new DOMException('Permission denied', 'NotAllowedError'),
      );

      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.errorType).toBe('permission-denied');
      expect(result.error).toContain('Permission denied');
    });

    it('handles unknown errors', async () => {
      (mockFileHandle.getFile as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Unknown error'),
      );

      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.errorType).toBe('unknown');
      expect(result.error).toContain('Unknown error');
    });

    it('handles non-Error exceptions', async () => {
      (mockFileHandle.getFile as ReturnType<typeof vi.fn>).mockRejectedValue(
        'String error',
      );

      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.errorType).toBe('unknown');
      expect(result.error).toContain('Unknown error');
    });
  });

  describe('Edge cases', () => {
    it('handles very wide image', async () => {
      const wideBitmap = {
        width: 10000,
        height: 100,
        close: vi.fn(),
      } as unknown as ImageBitmap;

      // Calculate expected resize dimensions accounting for MIN_DOWNSCALE_RATIO
      const maxDimension = Math.max(10000, 100); // 10000
      const idealRatio = MAX_IMAGE_EDGE_PX / maxDimension;
      const resizeRatio = Math.max(MIN_DOWNSCALE_RATIO, idealRatio);
      const expectedWidth = Math.round(10000 * resizeRatio);
      const expectedHeight = Math.round(100 * resizeRatio);

      // Mock createImageBitmap to return the wide bitmap (only called once)
      global.createImageBitmap = vi.fn().mockResolvedValueOnce(wideBitmap);

      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.resizeRatio).toBe(resizeRatio);
      expect(result.resizedWidth).toBe(expectedWidth);
      expect(result.resizedHeight).toBe(expectedHeight);
    });

    it('handles very tall image', async () => {
      const tallBitmap = {
        width: 100,
        height: 10000,
        close: vi.fn(),
      } as unknown as ImageBitmap;

      // Calculate expected resize dimensions accounting for MIN_DOWNSCALE_RATIO
      const maxDimension = Math.max(100, 10000); // 10000
      const idealRatio = MAX_IMAGE_EDGE_PX / maxDimension;
      const resizeRatio = Math.max(MIN_DOWNSCALE_RATIO, idealRatio);
      const expectedWidth = Math.round(100 * resizeRatio);
      const expectedHeight = Math.round(10000 * resizeRatio);

      // Mock createImageBitmap to return the tall bitmap (only called once)
      global.createImageBitmap = vi.fn().mockResolvedValueOnce(tallBitmap);

      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.resizeRatio).toBe(resizeRatio);
      expect(result.resizedWidth).toBe(expectedWidth);
      expect(result.resizedHeight).toBe(expectedHeight);
    });

    it('handles square image', async () => {
      const squareBitmap = {
        width: 2048,
        height: 2048,
        close: vi.fn(),
      } as unknown as ImageBitmap;

      global.createImageBitmap = vi
        .fn()
        .mockResolvedValueOnce(squareBitmap)
        .mockImplementation(async () => {
          return {
            width: mockCanvas.width,
            height: mockCanvas.height,
            close: vi.fn(),
          } as unknown as ImageBitmap;
        });

      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.resizedWidth).toBe(result.resizedHeight);
    });

    it('records accurate elapsed time', async () => {
      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
      expect(result.elapsedMs).toBeLessThan(1000); // Should be fast in tests
    });
  });

  describe('Resize ratio calculation', () => {
    it('returns 1.0 for image within limits', async () => {
      const bitmap = {
        width: MAX_IMAGE_EDGE_PX,
        height: MAX_IMAGE_EDGE_PX - 100,
        close: vi.fn(),
      } as unknown as ImageBitmap;
      global.createImageBitmap = vi.fn().mockResolvedValue(bitmap);

      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.resizeRatio).toBe(1.0);
    });

    it('calculates correct ratio for oversized width', async () => {
      const largeBitmap = {
        width: MAX_IMAGE_EDGE_PX * 2, // 768px
        height: 200,
        close: vi.fn(),
      } as unknown as ImageBitmap;

      // Calculate expected resize dimensions
      const resizeRatio = 0.5; // 384 / 768
      const expectedWidth = Math.round(MAX_IMAGE_EDGE_PX * 2 * resizeRatio); // 384
      const expectedHeight = Math.round(200 * resizeRatio); // 100

      const resizedBitmap = {
        width: expectedWidth,
        height: expectedHeight,
        close: vi.fn(),
      } as unknown as ImageBitmap;

      global.createImageBitmap = vi
        .fn()
        .mockResolvedValueOnce(largeBitmap)
        .mockResolvedValueOnce(resizedBitmap);

      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.resizeRatio).toBeCloseTo(0.5, 2);
    });

    it('calculates correct ratio for oversized height', async () => {
      const tallBitmap = {
        width: 1000,
        height: MAX_IMAGE_EDGE_PX * 3,
        close: vi.fn(),
      } as unknown as ImageBitmap;

      global.createImageBitmap = vi
        .fn()
        .mockResolvedValueOnce(tallBitmap)
        .mockImplementation(async () => {
          return {
            width: mockCanvas.width,
            height: mockCanvas.height,
            close: vi.fn(),
          } as unknown as ImageBitmap;
        });

      const result = await ingestImageForPrompt(mockFileHandle);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.resizeRatio).toBeCloseTo(1 / 3, 2);
    });
  });
});
