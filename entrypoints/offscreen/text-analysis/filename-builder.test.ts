import { describe, expect, it } from 'vitest';

import type { TextUpgradeAnalysisRequest, TextUpgradeIngestionResult } from '@/entrypoints/shared/integrations/text-analysis/types';
import type { FileType } from '@/entrypoints/shared/settings/types';
import { buildFilename } from './filename-builder';

const baseIngestion: TextUpgradeIngestionResult = {
  status: 'ingested',
  requestId: 'req-1',
  analyzedAt: Date.now(),
  text: 'Sample description',
  encoding: 'utf-8',
  originalLength: 18,
  truncated: false,
  sizeBytes: 256,
  metrics: {
    readBytes: 256,
    elapsedMs: 5,
  },
};

function createRequest(
  overrides: Partial<TextUpgradeAnalysisRequest> = {},
): TextUpgradeAnalysisRequest {
  const request: TextUpgradeAnalysisRequest = {
    requestId: 'req-1',
    historyId: 'hist-1',
    downloadId: 1,
    url: 'https://pixabay.com/pl/photos/klasztor-ottili-bawaria-niemcy-9939590/',
    filename: 'monastery-9939590_1280.webp',
    relativePath: 'Downloads/monastery-9939590_1280.webp',
    mimeType: 'image/webp',
    sizeBytes: 247170,
    fileType: 'image' as FileType,
    baseline: {
      original: 'monastery-9939590_1280.webp',
      final: 'monastery-9939590_1280.webp',
      decision: undefined,
    },
    pageContext: {
      title: 'Klasztor Ottili Bawaria',
      heading: 'Zdjęcie numer 9939590',
      url: 'https://pixabay.com/pl/photos/klasztor-ottili-bawaria-niemcy-9939590/',
    },
    settings: {
      languagePreference: 'auto',
      mode: 'on-device-only',
      maxBytes: 1024 * 1024,
      maxFilenameLength: 80,
      separator: 'clean',
      transliterateAscii: true,
    },
    cloudConfig: {
      enabled: false,
      apiKey: null,
      model: 'gemini-flash-lite-latest',
      consentGiven: false,
      consentTimestamp: null,
    },
    processingPreferences: {
      text: 'local',
      pdf: 'local',
      image: 'local',
    },
  };

  return { ...request, ...overrides };
}

describe('buildFilename contextual tokens', () => {
  it('appends numeric identifiers for non-image files', () => {
    const request = createRequest({
      fileType: 'pdf' as FileType,
      filename: 'monastery-9939590.pdf',
      baseline: {
        original: 'monastery-9939590.pdf',
        final: 'monastery-9939590.pdf',
        decision: undefined,
      },
    });
    const result = buildFilename({
      request,
      ingestion: baseIngestion,
      subject: 'Ottili Monastery Bavaria',
    });

    expect(result.filename).toBe('Ottili Monastery Bavaria 9939590.pdf');
  });

  it('skips numeric identifiers for images even when metadata matches', () => {
    const request = createRequest();

    const result = buildFilename({
      request,
      ingestion: baseIngestion,
      subject: 'Ottili Monastery Bavaria',
    });

    expect(result.filename).toBe('Ottili Monastery Bavaria.webp');
  });

  it('skips numeric tokens when they do not match metadata', () => {
    const request = createRequest({
      pageContext: {
        title: 'Ottili Monastery Bavaria',
        heading: 'Historic church view',
        url: 'https://pixabay.com/pl/photos/klasztor-ottili-bawaria/',
      },
      url: 'https://pixabay.com/pl/photos/klasztor-ottili-bawaria/',
    });

    const result = buildFilename({
      request,
      ingestion: baseIngestion,
      subject: 'Ottili Monastery Bavaria',
    });

    expect(result.filename).toBe('Ottili Monastery Bavaria.webp');
  });

  it('preserves resolution qualifiers found in the baseline', () => {
    const request = createRequest({
      filename: 'model-9657359_960_720.webp',
      baseline: {
        original: 'model-9657359_960_720.webp',
        final: 'model-9657359_960_720.webp',
        decision: undefined,
      },
    });

    const result = buildFilename({
      request,
      ingestion: baseIngestion,
      subject: 'Model Braided Dark Makeup Punk',
    });

    expect(result.filename).toBe('Model Braided Dark Makeup Punk 960x720.webp');
  });
});
