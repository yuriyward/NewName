import { describe, expect, it } from 'vitest';
import type { InstantBaselineSignals } from '@/entrypoints/shared/context/page-analyzer';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import { DEFAULT_SETTINGS } from '@/entrypoints/shared/settings/settings';
import { evaluateInstantBaseline } from './instant-baseline-strategy';

describe('evaluateInstantBaseline (deterministic strategies)', () => {
  const baseSignals: InstantBaselineSignals = {
    url: 'https://example.com/download/report.pdf',
    filename: 'Downloads/report.pdf',
    mime: 'application/pdf',
    startTime: '2025-04-01T08:30:00Z',
    page: {
      title: 'Example Corp — Quarterly Report',
      capturedAt: Date.now(),
    },
  };

  it('keeps original when strategy is keep-original', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'keep-original',
    } as const;

    const { evaluation } = evaluateInstantBaseline(baseSignals, settings);

    expect(evaluation.decision.outcome).toBe('keep');
    expect(evaluation.decision.guardrail).toBe('strategy-unavailable');
    expect(evaluation.rename).toBeUndefined();
  });

  it('appends date to original filename when strategy is original-with-date', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'original-with-date',
    } as const;

    const { evaluation } = evaluateInstantBaseline(baseSignals, settings);

    expect(evaluation.decision.outcome).toBe('rename');
    expect(evaluation.decision.guardrail).toBe('strategy-applied');
    expect(evaluation.rename?.filename).toBe('report 2025-04-01.pdf');
    expect(evaluation.reasonTags).toEqual(['Original', 'Date']);
  });

  it('falls back to original when date missing for original-with-date', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'original-with-date',
    } as const;
    const signals = {
      ...baseSignals,
      startTime: undefined,
    };

    const { evaluation } = evaluateInstantBaseline(signals, settings);

    expect(evaluation.decision.outcome).toBe('keep');
    expect(evaluation.decision.guardrail).toBe('strategy-unavailable');
    expect(evaluation.rename).toBeUndefined();
    expect(evaluation.decision.reasons).toContain('missing:date');
  });

  it('preserves underscores when appending date for original-with-date', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'original-with-date',
    } as const;

    const signals = {
      ...baseSignals,
      filename: 'Downloads/meeting_notes.txt',
    };

    const { evaluation } = evaluateInstantBaseline(signals, settings);

    expect(evaluation.rename?.filename).toBe('meeting_notes_2025-04-01.txt');
  });

  it('preserves hyphenated names when appending date for original-with-date', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'original-with-date',
    } as const;

    const signals = {
      ...baseSignals,
      filename: 'Downloads/release-notes.md',
    };

    const { evaluation } = evaluateInstantBaseline(signals, settings);

    expect(evaluation.rename?.filename).toBe('release-notes-2025-04-01.md');
  });

  it('preserves space-delimited names when appending date for original-with-date', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'original-with-date',
    } as const;

    const signals = {
      ...baseSignals,
      filename: 'Downloads/My project plan.docx',
    };

    const { evaluation } = evaluateInstantBaseline(signals, settings);

    expect(evaluation.rename?.filename).toBe('My project plan 2025-04-01.docx');
  });

  it('preserves dotted names when appending date for original-with-date', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'original-with-date',
    } as const;

    const signals = {
      ...baseSignals,
      filename: 'Downloads/release.notes.txt',
    };

    const { evaluation } = evaluateInstantBaseline(signals, settings);

    expect(evaluation.rename?.filename).toBe('release.notes.2025-04-01.txt');
  });

  it('prefers the most frequent delimiter when multiple styles are present', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'original-with-date',
    } as const;

    const signals = {
      ...baseSignals,
      filename: 'Downloads/project_overview-v2 final.docx',
    };

    const { evaluation } = evaluateInstantBaseline(signals, settings);

    expect(evaluation.rename?.filename).toBe(
      'project_overview-v2 final_2025-04-01.docx',
    );
  });

  it('handles trailing delimiters when appending date for original-with-date', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'original-with-date',
    } as const;

    const signals = {
      ...baseSignals,
      filename: 'Downloads/report-.txt',
    };

    const { evaluation } = evaluateInstantBaseline(signals, settings);

    expect(evaluation.rename?.filename).toBe('report-2025-04-01.txt');
  });

  it('uses page title when strategy is page-title-with-date', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'page-title-with-date',
    } as const;

    const { evaluation } = evaluateInstantBaseline(baseSignals, settings);

    expect(evaluation.decision.outcome).toBe('rename');
    expect(evaluation.rename?.filename).toBe(
      'Example Corp Quarterly Report 2025-04-01.pdf',
    );
    expect(evaluation.reasonTags).toEqual(['PageTitle', 'Date']);
  });

  it('gracefully falls back when page title missing', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'page-title',
    } as const;
    const signals = {
      ...baseSignals,
      page: undefined,
    };

    const { evaluation } = evaluateInstantBaseline(signals, settings);

    expect(evaluation.decision.outcome).toBe('keep');
    expect(evaluation.decision.guardrail).toBe('strategy-unavailable');
    expect(evaluation.rename).toBeUndefined();
  });
});

describe('evaluateInstantBaseline (file-type awareness)', () => {
  const capturedAt = 1_700_000_000_000;

  it('preserves multi-part archive extensions and classifies as archive', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'page-title-with-date',
    };

    const signals: InstantBaselineSignals = {
      url: 'https://example.com/releases/bundle.tar.gz',
      filename: 'bundle.tar.gz',
      mime: 'application/gzip',
      startTime: '2025-05-04T10:15:30Z',
      page: {
        title: 'Release Build',
        capturedAt,
      },
    };

    const { evaluation } = evaluateInstantBaseline(signals, settings);

    expect(evaluation.fileType).toBe('archive');
    expect(evaluation.rename?.filename).toBe('Release Build 2025-05-04.tar.gz');
  });

  it.each([
    ['audio/mpeg', 'song.mp3', 'audio'],
    ['video/x-matroska', 'clip.weird', 'video'],
    ['application/x-7z-compressed', 'archive.unknownext', 'archive'],
  ] as const)(
    'classifies %s downloads as %s',
    (mime, filename, expectedType) => {
      const settings: Settings = {
        ...DEFAULT_SETTINGS,
        instantBaselineStrategy: 'keep-original',
      };

      const signals: InstantBaselineSignals = {
        url: `https://example.com/downloads/${filename}`,
        filename,
        mime,
        startTime: '2025-01-02T03:04:05Z',
        page: {
          title: 'Example Page',
          capturedAt,
        },
      };

      const { evaluation } = evaluateInstantBaseline(signals, settings);

      expect(evaluation.fileType).toBe(expectedType);
      expect(evaluation.rename).toBeUndefined();
    },
  );
});
