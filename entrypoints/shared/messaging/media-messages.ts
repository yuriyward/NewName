/**
 * Media analysis messages (image and PDF)
 * Handles image ingestion, PDF analysis, and media metadata extraction
 */

import type {
  PdfUpgradeAnalysisRequest,
  PdfUpgradeAnalysisResponse,
} from '@/entrypoints/offscreen/pdf-analysis/types';
import type {
  ImageUpgradeAnalysisRequest,
  ImageUpgradeAnalysisResponse,
} from '@/entrypoints/shared/integrations/image-analysis/types';
import type {
  MediaAnalysisRequest,
  MediaAnalysisResponse,
} from '@/entrypoints/shared/integrations/mediainfo/messages';
import { sendExtensionMessage } from './extension-messaging';

/**
 * Media analysis protocol - image and PDF analysis
 */
export interface MediaAnalysisProtocol {
  /**
   * Request media metadata analysis in the offscreen document.
   */
  requestMediaAnalysis(
    payload: MediaAnalysisRequest,
  ): Promise<MediaAnalysisResponse>;

  /**
   * Request image ingestion and analysis preparation inside the offscreen document.
   */
  requestImageIngestion(
    payload: ImageUpgradeAnalysisRequest,
  ): Promise<ImageUpgradeAnalysisResponse>;

  /**
   * Request PDF analysis (page extraction and image-based analysis) inside the offscreen document.
   */
  requestPdfAnalysis(
    payload: PdfUpgradeAnalysisRequest,
  ): Promise<PdfUpgradeAnalysisResponse>;
}

export async function requestMediaAnalysis(
  payload: MediaAnalysisRequest,
): Promise<MediaAnalysisResponse> {
  const result = await sendExtensionMessage('requestMediaAnalysis', payload);
  return await result;
}

export async function requestImageIngestion(
  payload: ImageUpgradeAnalysisRequest,
): Promise<ImageUpgradeAnalysisResponse> {
  const result = await sendExtensionMessage('requestImageIngestion', payload);
  return await result;
}

export async function requestPdfAnalysis(
  payload: PdfUpgradeAnalysisRequest,
): Promise<PdfUpgradeAnalysisResponse> {
  const result = await sendExtensionMessage('requestPdfAnalysis', payload);
  return await result;
}
