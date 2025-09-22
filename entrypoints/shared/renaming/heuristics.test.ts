import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/entrypoints/shared/settings/types';
import { type Phase1Signals, runPhase1Heuristics } from './heuristics';

describe('runPhase1Heuristics', () => {
  describe('source prioritization', () => {
    it('prefers link text and enriches with date and source', () => {
      const signals: Phase1Signals = {
        url: 'https://example.com/downloads/invoice-123.pdf',
        filename: 'Invoice_123_final.pdf',
        mime: 'application/pdf',
        startTime: '2024-03-01T12:00:00Z',
        page: {
          title: 'Invoice 123 - Example Corp',
          heading: 'Invoice 123',
          linkText: 'Download Invoice 123',
          linkRel: undefined,
          capturedAt: Date.now(),
        },
      };

      const result = runPhase1Heuristics(signals, DEFAULT_SETTINGS);

      expect(result.subject).toBe('Invoice 123');
      expect(result.reasonTags).toContain('Link');
      expect(result.source).toBe('on-device');
      expect(result.qualifiers).toContain('2024-03-01');
      expect(result.qualifiers).toContain('example');
      expect(result.fileType).toBe('pdf');
      expect(result.extension).toBe('pdf');
    });

    it('prefers heading over title when link text is not available', () => {
      const signals: Phase1Signals = {
        url: 'https://docs.company.com/report.pdf',
        filename: 'report.pdf',
        mime: 'application/pdf',
        page: {
          title: 'Company Documents - Q4 Report | Company Portal',
          heading: 'Q4 Financial Report',
          capturedAt: Date.now(),
        },
      };

      const result = runPhase1Heuristics(signals, DEFAULT_SETTINGS);

      expect(result.subject).toBe('Q4 Financial Report');
      expect(result.reasonTags).toContain('Heading');
      expect(result.source).toBe('on-device');
    });

    it('prefers title over URL when heading is not available', () => {
      const signals: Phase1Signals = {
        url: 'https://research.university.edu/papers/machine-learning-2024.pdf',
        filename: 'ml-paper.pdf',
        mime: 'application/pdf',
        page: {
          title: 'Machine Learning Research Paper 2024',
          capturedAt: Date.now(),
        },
      };

      const result = runPhase1Heuristics(signals, DEFAULT_SETTINGS);

      expect(result.subject).toBe('Machine Learning Research Paper 2024');
      expect(result.reasonTags).toContain('Title');
      expect(result.source).toBe('on-device');
    });

    it('extracts meaningful name from URL path when page context is unavailable', () => {
      const signals: Phase1Signals = {
        url: 'https://cdn.example.com/files/user-manual-v2.pdf',
        filename: 'download',
        mime: 'application/pdf',
        page: null,
      };

      const result = runPhase1Heuristics(signals, DEFAULT_SETTINGS);

      expect(result.subject).toBe('user manual v2');
      expect(result.reasonTags).toContain('URL');
      expect(result.source).toBe('metadata');
    });

    it('falls back to filename when no other sources are meaningful', () => {
      const signals: Phase1Signals = {
        url: 'https://example.com/download?id=12345',
        filename: 'Meeting Notes April.docx',
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        page: {
          title: 'Download Portal',
          capturedAt: Date.now(),
        },
      };

      const result = runPhase1Heuristics(signals, DEFAULT_SETTINGS);

      expect(result.subject).toBe('Meeting Notes April');
      expect(result.reasonTags).toContain('Filename');
      expect(result.source).toBe('metadata');
    });
  });

  describe('garbage filtering', () => {
    it('filters out garbage words from link text', () => {
      const signals: Phase1Signals = {
        url: 'https://example.com/file.pdf',
        filename: 'document.pdf',
        mime: 'application/pdf',
        page: {
          linkText: 'Click here to download final document copy',
          capturedAt: Date.now(),
        },
      };

      const result = runPhase1Heuristics(signals, DEFAULT_SETTINGS);

      expect(result.subject).toBe('document');
      expect(result.reasonTags).toContain('Link');
    });

    it('filters out hash-like strings', () => {
      const signals: Phase1Signals = {
        url: 'https://example.com/assets/af3e9eac7c9b0f23.pdf',
        filename: 'af3e9eac7c9b0f23.pdf',
        mime: 'application/pdf',
        startTime: undefined,
        page: {
          capturedAt: Date.now(),
        },
      };

      const result = runPhase1Heuristics(signals, DEFAULT_SETTINGS);

      expect(result.subject).toBe('downloaded file');
      expect(result.source).toBe('metadata');
    });

    it('removes brand name from title segments', () => {
      const signals: Phase1Signals = {
        url: 'https://github.com/user/repo/releases/download/v1.0/app.zip',
        filename: 'app.zip',
        mime: 'application/zip',
        page: {
          title: 'Release v1.0 | GitHub',
          capturedAt: Date.now(),
        },
      };

      const result = runPhase1Heuristics(signals, DEFAULT_SETTINGS);

      expect(result.subject).toBe('Release v1.0');
      expect(result.reasonTags).toContain('Title');
    });
  });

  describe('qualifiers generation', () => {
    it('adds date qualifier when document date is available and enabled', () => {
      const signals: Phase1Signals = {
        url: 'https://example.com/report.pdf',
        filename: 'report.pdf',
        mime: 'application/pdf',
        startTime: '2024-06-15T14:30:00Z',
        page: {
          title: 'Monthly Report',
          capturedAt: Date.now(),
        },
      };

      const result = runPhase1Heuristics(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          ...DEFAULT_SETTINGS.metadataToggles,
          docDate: true,
        },
      });

      expect(result.qualifiers).toContain('2024-06-15');
      expect(result.reasonTags).toContain('Date');
    });

    it('does not add date when already present in subject', () => {
      const signals: Phase1Signals = {
        url: 'https://example.com/report.pdf',
        filename: 'report.pdf',
        mime: 'application/pdf',
        startTime: '2024-06-15T14:30:00Z',
        page: {
          title: 'Report 2024 Summary',
          capturedAt: Date.now(),
        },
      };

      const result = runPhase1Heuristics(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          ...DEFAULT_SETTINGS.metadataToggles,
          docDate: true,
        },
      });

      expect(result.qualifiers).not.toContain('2024-06-15');
      expect(result.reasonTags).not.toContain('Date');
    });

    it('adds source hint when enabled and not already in subject', () => {
      const signals: Phase1Signals = {
        url: 'https://figma.com/file/screenshot.png',
        filename: 'screenshot.png',
        mime: 'image/png',
        page: {
          title: 'Design System Components',
          capturedAt: Date.now(),
        },
      };

      const result = runPhase1Heuristics(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          ...DEFAULT_SETTINGS.metadataToggles,
          sourceHint: true,
        },
      });

      expect(result.qualifiers).toContain('figma');
      expect(result.reasonTags).toContain('Source');
    });

    it('extracts resolution from image filename when media specs enabled', () => {
      const signals: Phase1Signals = {
        url: 'https://example.com/screenshot.png',
        filename: 'screenshot_1920x1080.png',
        mime: 'image/png',
        page: {
          title: 'App Screenshot',
          capturedAt: Date.now(),
        },
      };

      const result = runPhase1Heuristics(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          ...DEFAULT_SETTINGS.metadataToggles,
          mediaSpecs: true,
        },
      });

      expect(result.qualifiers).toContain('1920x1080');
      expect(result.reasonTags).toContain('Spec');
    });
  });

  describe('file type detection', () => {
    it('detects PDF type from MIME type', () => {
      const signals: Phase1Signals = {
        url: 'https://example.com/document',
        filename: 'document',
        mime: 'application/pdf',
        page: {
          title: 'Document',
          capturedAt: Date.now(),
        },
      };

      const result = runPhase1Heuristics(signals, DEFAULT_SETTINGS);

      expect(result.fileType).toBe('pdf');
      expect(result.extension).toBeNull(); // No extension in filename or URL
    });

    it('detects image type from extension when MIME is not available', () => {
      const signals: Phase1Signals = {
        url: 'https://example.com/photo.jpg',
        filename: 'photo.jpg',
        page: {
          title: 'Photo',
          capturedAt: Date.now(),
        },
      };

      const result = runPhase1Heuristics(signals, DEFAULT_SETTINGS);

      expect(result.fileType).toBe('image');
      expect(result.extension).toBe('jpg');
    });

    it('extracts extension from URL when not present in filename', () => {
      const signals: Phase1Signals = {
        url: 'https://example.com/files/document.docx',
        filename: 'download',
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        page: {
          title: 'Document Download',
          capturedAt: Date.now(),
        },
      };

      const result = runPhase1Heuristics(signals, DEFAULT_SETTINGS);

      expect(result.extension).toBe('docx');
      expect(result.fileType).toBe('office');
    });
  });

  describe('real-world scenarios from PRD', () => {
    it('handles Polish government document download', () => {
      const signals: Phase1Signals = {
        url: 'https://gov.pl/forms/residence-permit-extension.pdf',
        filename: 'form-123456.pdf',
        mime: 'application/pdf',
        startTime: '2025-09-15T10:30:00Z',
        page: {
          title: 'Wniosek o przedłużenie zezwolenia na pobyt czasowy',
          capturedAt: Date.now(),
        },
      };

      const result = runPhase1Heuristics(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          ...DEFAULT_SETTINGS.metadataToggles,
          docDate: true,
          sourceHint: true,
        },
      });

      expect(result.subject).toBe('Wniosek o przedłużenie zezwolenia na pobyt czasowy');
      expect(result.qualifiers).toContain('2025-09-15');
      expect(result.qualifiers).toContain('gov');
      expect(result.fileType).toBe('pdf');
    });

    it('handles e-commerce receipt download', () => {
      const signals: Phase1Signals = {
        url: 'https://biedronka.pl/receipts/download?id=789',
        filename: 'receipt.pdf',
        mime: 'application/pdf',
        startTime: '2025-03-04T16:45:00Z',
        page: {
          linkText: 'Pobierz fakturę za zakupy z dnia 04.03.2025',
          capturedAt: Date.now(),
        },
      };

      const result = runPhase1Heuristics(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          ...DEFAULT_SETTINGS.metadataToggles,
          docDate: true,
          sourceHint: true,
        },
      });

      expect(result.subject).toBe('fakturę za zakupy z dnia 04.03.2025');
      expect(result.qualifiers).toContain('biedronka');
      expect(result.reasonTags).toContain('Link');
    });

    it('handles Figma screenshot export', () => {
      const signals: Phase1Signals = {
        url: 'https://figma.com/file/abc123/export/navbar-component.png',
        filename: 'navbar-component.png',
        mime: 'image/png',
        page: {
          title: 'Navbar Fix Dialog - Design System',
          capturedAt: Date.now(),
        },
      };

      const result = runPhase1Heuristics(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          ...DEFAULT_SETTINGS.metadataToggles,
          sourceHint: true,
        },
      });

      expect(result.subject).toBe('Navbar Fix Dialog - Design System');
      expect(result.qualifiers).toContain('figma');
      expect(result.fileType).toBe('image');
    });

    it('handles meeting recording from video platform', () => {
      const signals: Phase1Signals = {
        url: 'https://zoom.us/recordings/download/GMT20240101-120000_Sprint-Planning.mp4',
        filename: 'GMT20240101-120000_Sprint-Planning.mp4',
        mime: 'video/mp4',
        page: {
          title: 'Sprint Planning - Q4 Goals Review',
          capturedAt: Date.now(),
        },
      };

      const result = runPhase1Heuristics(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          ...DEFAULT_SETTINGS.metadataToggles,
          sourceHint: true,
        },
      });

      expect(result.subject).toBe('Sprint Planning - Q4 Goals Review');
      expect(result.qualifiers).toContain('zoom');
      expect(result.fileType).toBe('video');
    });
  });

  describe('edge cases', () => {
    it('handles empty page context gracefully', () => {
      const signals: Phase1Signals = {
        url: 'https://example.com/file.txt',
        filename: 'file.txt',
        page: null,
      };

      const result = runPhase1Heuristics(signals, DEFAULT_SETTINGS);

      expect(result.subject).toBe('file');
      expect(result.source).toBe('metadata');
      expect(result.fileType).toBe('data');
    });

    it('handles malformed URLs gracefully', () => {
      const signals: Phase1Signals = {
        url: 'https://example.com/',
        filename: 'download',
        page: {
          title: 'Download Page',
          capturedAt: Date.now(),
        },
      };

      const result = runPhase1Heuristics(signals, DEFAULT_SETTINGS);

      expect(result.subject).toBe('Download Page');
      expect(result.source).toBe('on-device');
    });

    it('handles disabled metadata toggles', () => {
      const signals: Phase1Signals = {
        url: 'https://example.com/report.pdf',
        filename: 'report.pdf',
        mime: 'application/pdf',
        startTime: '2024-06-15T14:30:00Z',
        page: {
          title: 'Monthly Report',
          capturedAt: Date.now(),
        },
      };

      const result = runPhase1Heuristics(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          docDate: false,
          sourceHint: false,
          geo: false,
          mediaSpecs: false,
        },
      });

      expect(result.qualifiers).toHaveLength(0);
      expect(result.reasonTags).not.toContain('Date');
      expect(result.reasonTags).not.toContain('Source');
    });
  });
});
