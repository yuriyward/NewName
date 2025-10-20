/**
 * Type definitions for PDF analysis pipeline
 */

import type { UpgradeProposal } from '@/entrypoints/shared/history/types';
import type { ImageUpgradeAnalysisRequest } from '@/entrypoints/shared/integrations/image-analysis/types';

/** Metadata for a single rendered PDF page */
export interface RenderedPdfPage {
  /** Page number (1-indexed) */
  pageNumber: number;
  /** PNG blob of the rendered page */
  blob: Blob;
  /** Width of rendered canvas in pixels */
  width: number;
  /** Height of rendered canvas in pixels */
  height: number;
  /** Time to render this page in milliseconds */
  renderTimeMs: number;
}

/** Result of extracting pages from a PDF */
export interface PdfPageExtractionResult {
  success: true;
  pages: RenderedPdfPage[];
  totalPages: number;
  totalExtractionTimeMs: number;
}

/** Error during PDF extraction */
export interface PdfPageExtractionError {
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

export type PdfExtractionOutput =
  | PdfPageExtractionResult
  | PdfPageExtractionError;

/** Request to analyze a PDF file via image recognition */
export interface PdfUpgradeAnalysisRequest
  extends Omit<ImageUpgradeAnalysisRequest, 'fileType' | 'settings'> {
  fileType: 'pdf';
  settings: ImageUpgradeAnalysisRequest['settings'] & {
    mode: 'on-device-only';
  };
}

/** Response indicating PDF analysis is unavailable */
export interface PdfUpgradeAnalysisUnavailable {
  status: 'unavailable';
  requestId: string;
  analyzedAt: number;
  reason: 'permissions-denied' | 'invalid-pdf' | 'no-pages' | 'unsupported';
  message: string;
}

/** Error response from PDF analysis */
export interface PdfUpgradeAnalysisErrorResponse {
  status: 'error';
  requestId: string;
  analyzedAt: number;
  error: string;
}

/** Successful PDF analysis response (pages ingested) */
export interface PdfPageIngestionResult {
  status: 'ingested';
  requestId: string;
  analyzedAt: number;
  pageCount: number;
  pages: Array<{
    pageNumber: number;
    width: number;
    height: number;
  }>;
}

/** Successful PDF analysis with AI-generated proposal */
export interface PdfAnalysisSuccess {
  status: 'success';
  requestId: string;
  analyzedAt: number;
  proposal: UpgradeProposal;
  pagesAnalyzed: number;
  totalPages: number;
}

export type PdfUpgradeAnalysisResponse =
  | PdfAnalysisSuccess
  | PdfPageIngestionResult
  | PdfUpgradeAnalysisUnavailable
  | PdfUpgradeAnalysisErrorResponse;
