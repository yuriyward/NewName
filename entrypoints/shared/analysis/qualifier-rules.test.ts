import { describe, expect, it } from 'vitest';
import type { Candidate } from '@/entrypoints/shared/analysis/candidate-ranking';
import type { Phase1Signals } from '@/entrypoints/shared/context/page-analyzer';
import { DEFAULT_SETTINGS } from '@/entrypoints/shared/settings/types';
import {
  applyDocumentDateQualifier,
  applyMediaSpecQualifier,
  applySourceQualifier,
  deriveQualifiers,
  pushQualifier,
  QUALIFIER_RULES,
} from './qualifier-rules';

describe('qualifier-rules', () => {
  const baseCandidate: Candidate = {
    value: 'Quarterly Report',
    reason: 'Title',
    score: 80,
    source: 'on-device',
  };

  const baseSignals: Phase1Signals = {
    url: 'https://example.com/report.pdf',
    filename: 'report.pdf',
  };

  describe('pushQualifier', () => {
    it('trims input and ignores empty strings', () => {
      const state = {
        qualifiers: [] as string[],
        reasons: [] as string[],
        lowerCandidate: 'quarterly report',
      };

      pushQualifier(state, '  2024-03-01  ', 'Date');
      pushQualifier(state, '   ', 'Empty');

      expect(state.qualifiers).toEqual(['2024-03-01']);
      expect(state.reasons).toEqual(['Date']);
    });
  });

  describe('applyDocumentDateQualifier', () => {
    it('adds ISO date when enabled and absent from candidate', () => {
      const state = {
        qualifiers: [] as string[],
        reasons: [] as string[],
        lowerCandidate: 'quarterly report',
      };
      const params = {
        signals: { ...baseSignals, startTime: '2024-03-01T12:00:00Z' },
        candidate: baseCandidate,
        brand: 'example',
        fileType: 'pdf' as const,
        settings: {
          ...DEFAULT_SETTINGS,
          metadataToggles: {
            ...DEFAULT_SETTINGS.metadataToggles,
            docDate: true,
          },
        },
      };

      applyDocumentDateQualifier(state, params);

      expect(state.qualifiers).toEqual(['2024-03-01']);
      expect(state.reasons).toEqual(['Date']);
    });

    it('skips when year already present in subject', () => {
      const state = {
        qualifiers: [] as string[],
        reasons: [] as string[],
        lowerCandidate: 'report 2024 summary',
      };
      const params = {
        signals: { ...baseSignals, startTime: '2024-03-01T12:00:00Z' },
        candidate: { ...baseCandidate, value: 'Report 2024 Summary' },
        brand: 'example',
        fileType: 'pdf' as const,
        settings: {
          ...DEFAULT_SETTINGS,
          metadataToggles: {
            ...DEFAULT_SETTINGS.metadataToggles,
            docDate: true,
          },
        },
      };

      applyDocumentDateQualifier(state, params);

      expect(state.qualifiers).toHaveLength(0);
      expect(state.reasons).toHaveLength(0);
    });
  });

  describe('applySourceQualifier', () => {
    it('adds brand when enabled and absent from candidate', () => {
      const state = {
        qualifiers: [] as string[],
        reasons: [] as string[],
        lowerCandidate: 'quarterly report',
      };
      const params = {
        signals: baseSignals,
        candidate: baseCandidate,
        brand: 'Example',
        fileType: 'pdf' as const,
        settings: {
          ...DEFAULT_SETTINGS,
          metadataToggles: {
            ...DEFAULT_SETTINGS.metadataToggles,
            sourceHint: true,
          },
        },
      };

      applySourceQualifier(state, params);

      expect(state.qualifiers).toEqual(['Example']);
      expect(state.reasons).toEqual(['Source']);
    });

    it('skips when brand missing or already present', () => {
      const state = {
        qualifiers: [] as string[],
        reasons: [] as string[],
        lowerCandidate: 'example quarterly report',
      };
      const params = {
        signals: baseSignals,
        candidate: baseCandidate,
        brand: 'example',
        fileType: 'pdf' as const,
        settings: {
          ...DEFAULT_SETTINGS,
          metadataToggles: {
            ...DEFAULT_SETTINGS.metadataToggles,
            sourceHint: true,
          },
        },
      };

      applySourceQualifier(state, { ...params, brand: null });
      applySourceQualifier(state, params);

      expect(state.qualifiers).toHaveLength(0);
      expect(state.reasons).toHaveLength(0);
    });
  });

  describe('applyMediaSpecQualifier', () => {
    it('adds resolution qualifiers for images when enabled', () => {
      const state = {
        qualifiers: [] as string[],
        reasons: [] as string[],
        lowerCandidate: 'app screenshot',
      };
      const params = {
        signals: { ...baseSignals, filename: 'screenshot_1920x1080.png' },
        candidate: baseCandidate,
        brand: 'example',
        fileType: 'image' as const,
        settings: {
          ...DEFAULT_SETTINGS,
          metadataToggles: {
            ...DEFAULT_SETTINGS.metadataToggles,
            mediaSpecs: true,
          },
        },
      };

      applyMediaSpecQualifier(state, params);

      expect(state.qualifiers).toEqual(['1920x1080']);
      expect(state.reasons).toEqual(['Spec']);
    });

    it('skips when resolution already in subject or toggle disabled', () => {
      const state = {
        qualifiers: [] as string[],
        reasons: [] as string[],
        lowerCandidate: 'screenshot 1920x1080',
      };
      const params = {
        signals: { ...baseSignals, filename: 'screenshot_1920x1080.png' },
        candidate: baseCandidate,
        brand: 'example',
        fileType: 'image' as const,
        settings: {
          ...DEFAULT_SETTINGS,
          metadataToggles: {
            ...DEFAULT_SETTINGS.metadataToggles,
            mediaSpecs: true,
          },
        },
      };

      applyMediaSpecQualifier(state, {
        ...params,
        settings: {
          ...params.settings,
          metadataToggles: {
            ...params.settings.metadataToggles,
            mediaSpecs: false,
          },
        },
      });
      applyMediaSpecQualifier(state, params);

      expect(state.qualifiers).toHaveLength(0);
      expect(state.reasons).toHaveLength(0);
    });
  });

  describe('deriveQualifiers', () => {
    it('runs registered rules and returns qualifiers with reasons', () => {
      const params = {
        signals: {
          ...baseSignals,
          startTime: '2024-03-01T12:00:00Z',
          filename: 'screenshot_1920x1080.png',
        },
        candidate: baseCandidate,
        brand: 'Example',
        fileType: 'image' as const,
        settings: {
          ...DEFAULT_SETTINGS,
          metadataToggles: {
            ...DEFAULT_SETTINGS.metadataToggles,
            docDate: true,
            sourceHint: true,
            mediaSpecs: true,
          },
        },
      };

      const result = deriveQualifiers(params);

      expect(result.qualifiers).toEqual(['2024-03-01', 'Example', '1920x1080']);
      expect(result.reasonTags).toEqual(['Date', 'Source', 'Spec']);
      expect(result.qualifiers).toHaveLength(QUALIFIER_RULES.length);
    });
  });
});
