/**
 * Constants for PDF analysis and rendering
 */

/** Maximum number of pages to extract from PDF for image-based analysis */
export const MAX_PDF_PAGES = 2;

/** Scale factor for rendering PDF pages to canvas (1.5x for better quality) */
export const PDF_RENDER_SCALE = 1.5;

/** Maximum file size for PDF analysis (50MB) */
export const MAX_PDF_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/** PDF rendering timeout per page (in milliseconds) */
export const PDF_RENDER_TIMEOUT_MS = 5000;

/** Page range to analyze - always start from page 1 */
export const FIRST_PAGE_INDEX = 0;

/** Target format for rendered pages */
export const PDF_PAGE_IMAGE_FORMAT = 'image/png' as const;
