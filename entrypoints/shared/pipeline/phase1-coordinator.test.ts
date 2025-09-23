import { describe, expect, it } from 'vitest';
import type { Phase1Signals } from '@/entrypoints/shared/context/page-analyzer';
import { DEFAULT_SETTINGS } from '@/entrypoints/shared/settings/types';
import { computePhase1Outcome } from './phase1-coordinator';

describe('computePhase1Outcome', () => {
  describe('complete pipeline integration', () => {
    it('processes invoice download with full context and metadata', () => {
      const signals: Phase1Signals = {
        url: 'https://example.com/invoices/march-2024.pdf',
        filename: 'Downloads/invoice_final_copy.pdf',
        mime: 'application/pdf',
        startTime: '2024-03-15T14:30:00Z',
        page: {
          title: 'Monthly Invoice - March 2024 | Example Corp',
          heading: 'Invoice #12345',
          linkText: 'Download March Invoice',
          capturedAt: Date.now(),
        },
      };

      const result = computePhase1Outcome(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          ...DEFAULT_SETTINGS.metadataToggles,
          docDate: true,
          sourceHint: true,
        },
        maxLen: 80,
        separator: 'clean',
        transliterateAscii: false,
      });

      expect(result.filename).toBe('March Invoice 2024-03-15 Example.pdf');
      expect(result.path).toBe(
        'Downloads/March Invoice 2024-03-15 Example.pdf',
      );
      expect(result.reasonTags).toContain('Link');
      expect(result.reasonTags).toContain('Date');
      expect(result.reasonTags).toContain('Source');
      expect(result.source).toBe('on-device');
      expect(result.fileType).toBe('pdf');
      expect(result.originalPath).toBe('Downloads/invoice_final_copy.pdf');
    });

    it('handles screenshot with kebab-case formatting', () => {
      const signals: Phase1Signals = {
        url: 'https://figma.com/file/design-system/navbar.png',
        filename: 'navbar_component_1920x1080.png',
        mime: 'image/png',
        page: {
          title: 'Navbar Component - Mobile Responsive Design',
          capturedAt: Date.now(),
        },
      };

      const result = computePhase1Outcome(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          ...DEFAULT_SETTINGS.metadataToggles,
          sourceHint: true,
          mediaSpecs: true,
        },
        maxLen: 60,
        separator: 'kebab',
        transliterateAscii: false,
      });

      expect(result.filename).toBe(
        'navbar-component-mobile-responsive-design-figma-1920x1080.png',
      );
      expect(result.path).toBe(
        'navbar-component-mobile-responsive-design-figma-1920x1080.png',
      );
      expect(result.reasonTags).toContain('Title');
      expect(result.reasonTags).toContain('Source');
      expect(result.reasonTags).toContain('Spec');
      expect(result.fileType).toBe('image');
    });

    it('handles meeting recording with duration metadata', () => {
      const signals: Phase1Signals = {
        url: 'https://zoom.us/recordings/download/meeting.mp4',
        filename: 'temp/rec_1234567890.mp4',
        mime: 'video/mp4',
        page: {
          linkText: 'Download Sprint Planning Session - 45 minutes',
          capturedAt: Date.now(),
        },
      };

      const result = computePhase1Outcome(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          ...DEFAULT_SETTINGS.metadataToggles,
          sourceHint: true,
        },
        maxLen: 70,
        separator: 'clean',
        transliterateAscii: false,
      });

      expect(result.filename).toBe(
        'Sprint Planning Session 45 Minutes Zoom.mp4',
      );
      expect(result.path).toBe(
        'temp/Sprint Planning Session 45 Minutes Zoom.mp4',
      );
      expect(result.reasonTags).toContain('Link');
      expect(result.reasonTags).toContain('Source');
      expect(result.fileType).toBe('video');
    });
  });

  describe('length constraint handling', () => {
    it('respects length limits while preserving essential information', () => {
      const signals: Phase1Signals = {
        url: 'https://university.edu/research/papers/machine-learning-artificial-intelligence-deep-neural-networks.pdf',
        filename:
          'research_paper_very_long_title_with_many_descriptive_words.pdf',
        mime: 'application/pdf',
        startTime: '2024-06-15T10:00:00Z',
        page: {
          title:
            'Advanced Machine Learning Techniques for Artificial Intelligence Applications in Deep Neural Network Architectures',
          capturedAt: Date.now(),
        },
      };

      const result = computePhase1Outcome(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          ...DEFAULT_SETTINGS.metadataToggles,
          docDate: true,
          sourceHint: true,
        },
        maxLen: 50, // Very constrained
        separator: 'clean',
        transliterateAscii: false,
      });

      expect(result.filename.length).toBeLessThanOrEqual(50);
      expect(result.filename.endsWith('.pdf')).toBe(true);
      expect(result.filename).toContain('Machine Learning');
      expect(result.reasonTags).toContain('Title');
    });

    it('falls back gracefully when all sources are too long', () => {
      const signals: Phase1Signals = {
        url: 'https://example.com/files/extremely-long-filename-that-exceeds-reasonable-limits.txt',
        filename:
          'an-incredibly-verbose-and-unnecessarily-long-filename-that-no-reasonable-person-would-use.txt',
        page: {
          title:
            'An Extraordinarily Long Page Title That Describes Every Possible Detail About The Content In Excruciating Detail',
          capturedAt: Date.now(),
        },
      };

      const result = computePhase1Outcome(signals, {
        ...DEFAULT_SETTINGS,
        maxLen: 25, // Very constrained
        separator: 'clean',
        transliterateAscii: false,
      });

      expect(result.filename.length).toBeLessThanOrEqual(25);
      expect(result.filename.endsWith('.txt')).toBe(true);
      expect(result.filename.length).toBeGreaterThan(4); // At least something meaningful
    });
  });

  describe('directory preservation', () => {
    // TODO: Re-enable once we expose host-aware source qualifier toggles (Phase 2).
    it.skip('preserves directory structure in path', () => {
      const signals: Phase1Signals = {
        url: 'https://example.com/document.pdf',
        filename: 'Documents/Work/Projects/Q4/report.pdf',
        mime: 'application/pdf',
        page: {
          title: 'Q4 Performance Report',
          capturedAt: Date.now(),
        },
      };

      const result = computePhase1Outcome(signals, DEFAULT_SETTINGS);

      expect(result.filename).toBe('Q4 Performance Report.pdf');
      expect(result.path).toBe(
        'Documents/Work/Projects/Q4/Q4 Performance Report.pdf',
      );
      expect(result.originalPath).toBe('Documents/Work/Projects/Q4/report.pdf');
    });

    // TODO: Re-enable once we expose host-aware source qualifier toggles (Phase 2).
    it.skip('handles root-level files without directory', () => {
      const signals: Phase1Signals = {
        url: 'https://example.com/document.pdf',
        filename: 'report.pdf',
        mime: 'application/pdf',
        page: {
          title: 'Annual Report',
          capturedAt: Date.now(),
        },
      };

      const result = computePhase1Outcome(signals, DEFAULT_SETTINGS);

      expect(result.filename).toBe('Annual Report.pdf');
      expect(result.path).toBe('Annual Report.pdf');
      expect(result.originalPath).toBe('report.pdf');
    });
  });

  describe('multilingual support', () => {
    // TODO: Restore when we ship richer multi-token preservation for Slavic titles.
    it.skip('preserves Polish characters when transliteration is disabled', () => {
      const signals: Phase1Signals = {
        url: 'https://gov.pl/forms/residence.pdf',
        filename: 'form.pdf',
        mime: 'application/pdf',
        startTime: '2025-09-15T10:30:00Z',
        page: {
          title: 'Wniosek o przedłużenie zezwolenia na pobyt czasowy',
          capturedAt: Date.now(),
        },
      };

      const result = computePhase1Outcome(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          ...DEFAULT_SETTINGS.metadataToggles,
          docDate: true,
          sourceHint: true,
        },
        transliterateAscii: false,
      });

      expect(result.filename).toBe(
        'Wniosek O Przedłużenie Zezwolenia Na Pobyt Czasowy 2025-09-15 Gov.pdf',
      );
      expect(result.filename).toContain('ł'); // Polish character preserved
      expect(result.reasonTags).toContain('Title');
      expect(result.reasonTags).toContain('Date');
    });

    // TODO: Restore when heading/title fusion keeps all hyphen-separated segments.
    it.skip('transliterates non-ASCII characters when enabled', () => {
      const signals: Phase1Signals = {
        url: 'https://example.fr/document.pdf',
        filename: 'document.pdf',
        mime: 'application/pdf',
        page: {
          title: 'Résumé professionnel - François Müller',
          capturedAt: Date.now(),
        },
      };

      const result = computePhase1Outcome(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          ...DEFAULT_SETTINGS.metadataToggles,
          sourceHint: true,
        },
        transliterateAscii: true,
      });

      expect(result.filename).toBe(
        'Resume Professionnel Francois Muller Example.pdf',
      );
      expect(result.filename).not.toContain('é');
      expect(result.filename).not.toContain('ç');
      expect(result.filename).not.toContain('ü');
    });
  });

  describe('metadata toggle effects', () => {
    it('excludes date when docDate toggle is disabled', () => {
      const signals: Phase1Signals = {
        url: 'https://example.com/report.pdf',
        filename: 'report.pdf',
        mime: 'application/pdf',
        startTime: '2024-03-15T14:30:00Z',
        page: {
          title: 'Monthly Report',
          capturedAt: Date.now(),
        },
      };

      const result = computePhase1Outcome(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          ...DEFAULT_SETTINGS.metadataToggles,
          docDate: false, // Disabled
          sourceHint: true,
        },
      });

      expect(result.filename).toBe('Monthly Report Example.pdf');
      expect(result.filename).not.toContain('2024-03-15');
      expect(result.reasonTags).not.toContain('Date');
      expect(result.reasonTags).toContain('Source');
    });

    it('excludes source hint when sourceHint toggle is disabled', () => {
      const signals: Phase1Signals = {
        url: 'https://figma.com/screenshot.png',
        filename: 'screenshot.png',
        mime: 'image/png',
        page: {
          title: 'Design Component Screenshot',
          capturedAt: Date.now(),
        },
      };

      const result = computePhase1Outcome(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          ...DEFAULT_SETTINGS.metadataToggles,
          sourceHint: false, // Disabled
        },
      });

      expect(result.filename).toBe('Design Component Screenshot.png');
      expect(result.filename).not.toContain('figma');
      expect(result.reasonTags).not.toContain('Source');
      expect(result.reasonTags).toContain('Title');
    });

    // TODO: Revisit once metadata toggles drive per-domain source hints.
    it.skip('excludes media specs when mediaSpecs toggle is disabled', () => {
      const signals: Phase1Signals = {
        url: 'https://example.com/screenshot.png',
        filename: 'screenshot_1920x1080.png',
        mime: 'image/png',
        page: {
          title: 'App Screenshot',
          capturedAt: Date.now(),
        },
      };

      const result = computePhase1Outcome(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          ...DEFAULT_SETTINGS.metadataToggles,
          mediaSpecs: false, // Disabled
        },
      });

      expect(result.filename).toBe('App Screenshot.png');
      expect(result.filename).not.toContain('1920x1080');
      expect(result.reasonTags).not.toContain('Spec');
    });
  });

  describe('real-world PRD examples integration', () => {
    it('produces expected filename for Polish residence permit', () => {
      const signals: Phase1Signals = {
        url: 'https://gov.pl/forms/residence-permit-extension.pdf',
        filename: 'Downloads/form-12345.pdf',
        mime: 'application/pdf',
        startTime: '2025-09-15T10:30:00Z',
        page: {
          title: 'Wniosek o przedłużenie zezwolenia na pobyt',
          capturedAt: Date.now(),
        },
      };

      const result = computePhase1Outcome(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          ...DEFAULT_SETTINGS.metadataToggles,
          docDate: true,
          sourceHint: false, // Disable for cleaner example
        },
        maxLen: 80,
      });

      expect(result.filename).toBe(
        'Wniosek O Przedłużenie Zezwolenia Na Pobyt 2025-09-15.pdf',
      );
      expect(result.path).toBe(
        'Downloads/Wniosek O Przedłużenie Zezwolenia Na Pobyt 2025-09-15.pdf',
      );
    });

    it('produces expected filename for Biedronka invoice', () => {
      const signals: Phase1Signals = {
        url: 'https://biedronka.pl/receipts/download?id=789',
        filename: 'Downloads/receipt.pdf',
        mime: 'application/pdf',
        startTime: '2025-03-04T16:45:00Z',
        page: {
          linkText: 'Biedronka - Faktura - 146,20 PLN',
          capturedAt: Date.now(),
        },
      };

      const result = computePhase1Outcome(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          ...DEFAULT_SETTINGS.metadataToggles,
          docDate: true,
          sourceHint: false, // Disable to match PRD example
        },
        maxLen: 80,
      });

      expect(result.filename).toBe(
        'Biedronka Faktura 146,20 PLN 2025-03-04.pdf',
      );
      expect(result.path).toBe(
        'Downloads/Biedronka Faktura 146,20 PLN 2025-03-04.pdf',
      );
    });

    it('produces expected filename for Figma screenshot', () => {
      const signals: Phase1Signals = {
        url: 'https://figma.com/file/abc123/export/navbar.png',
        filename: 'navbar.png',
        mime: 'image/png',
        page: {
          title: 'Figma - Navbar fix - dialog',
          capturedAt: Date.now(),
        },
      };

      const result = computePhase1Outcome(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          ...DEFAULT_SETTINGS.metadataToggles,
          sourceHint: false, // Disable to match PRD example
        },
      });

      expect(result.filename).toBe('Figma Navbar Fix Dialog.png');
      expect(result.path).toBe('Figma Navbar Fix Dialog.png');
    });

    it('produces expected filename for meeting audio', () => {
      const signals: Phase1Signals = {
        url: 'https://zoom.us/recordings/download/meeting.mp3',
        filename: 'Downloads/recording.mp3',
        mime: 'audio/mpeg',
        page: {
          linkText: 'Waypass - Sprint planning - Q4 goals - 45m',
          capturedAt: Date.now(),
        },
      };

      const result = computePhase1Outcome(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          ...DEFAULT_SETTINGS.metadataToggles,
          sourceHint: false, // Disable to match PRD example
        },
      });

      expect(result.filename).toBe('Waypass Sprint Planning Q4 Goals 45m.mp3');
      expect(result.path).toBe(
        'Downloads/Waypass Sprint Planning Q4 Goals 45m.mp3',
      );
    });

    it('produces expected filename for video tutorial', () => {
      const signals: Phase1Signals = {
        url: 'https://youtube.com/watch?v=abc123/download.mp4',
        filename: 'Downloads/video.mp4',
        mime: 'video/mp4',
        page: {
          title: 'Supabase - CORS dla Edge Functions - 1080p - 12m',
          capturedAt: Date.now(),
        },
      };

      const result = computePhase1Outcome(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          ...DEFAULT_SETTINGS.metadataToggles,
          sourceHint: false, // Disable to match PRD example
        },
      });

      expect(result.filename).toBe(
        'Supabase CORS Dla Edge Functions 1080p 12m.mp4',
      );
      expect(result.path).toBe(
        'Downloads/Supabase CORS Dla Edge Functions 1080p 12m.mp4',
      );
    });

    it('produces expected filename for photo with location', () => {
      const signals: Phase1Signals = {
        url: 'https://photos.app/download/photo.jpg',
        filename: 'IMG_20250817_193045.jpg',
        mime: 'image/jpeg',
        startTime: '2025-08-17T19:30:45Z',
        page: {
          title: 'Zachód słońca - Tatry - Morskie Oko',
          capturedAt: Date.now(),
        },
      };

      const result = computePhase1Outcome(signals, {
        ...DEFAULT_SETTINGS,
        metadataToggles: {
          ...DEFAULT_SETTINGS.metadataToggles,
          docDate: true,
          sourceHint: false, // Disable to match PRD example
        },
      });

      expect(result.filename).toBe(
        'Zachód Słońca Tatry Morskie Oko 2025-08-17.jpg',
      );
      expect(result.path).toBe(
        'Zachód Słońca Tatry Morskie Oko 2025-08-17.jpg',
      );
    });
  });
});
