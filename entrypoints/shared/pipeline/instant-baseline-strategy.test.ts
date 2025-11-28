import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InstantBaselineSignals } from '@/entrypoints/shared/context/page-analyzer';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import { DEFAULT_SETTINGS } from '@/entrypoints/shared/settings/settings';
import { evaluateInstantBaseline } from './instant-baseline-strategy';

/**
 * Mock Date to return a fixed timezone offset (UTC+2)
 * This makes tests deterministic across different machines
 */
class MockDate extends Date {
  getTimezoneOffset(): number {
    // Return -120 for UTC+2 (offset is inverted: negative means ahead of UTC)
    return -120;
  }
}

beforeEach(() => {
  // Replace global Date with our mock for consistent timezone in tests
  vi.stubGlobal('Date', MockDate);
});

// Restore after all tests
afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it('defers rename to AI pipeline when strategy is ai-rename', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'ai-rename',
    } as const;

    const { evaluation } = evaluateInstantBaseline(baseSignals, settings);

    expect(evaluation.decision.outcome).toBe('keep');
    expect(evaluation.decision.guardrail).toBe('strategy-deferred');
    expect(evaluation.decision.reasons).toContain('missing:strategy:ai-rename');
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
    // Input: 2025-04-01T08:30:00Z (UTC), Expected: 2025-04-01_10-30 (UTC+2)
    expect(evaluation.rename?.filename).toBe('2025-04-01_10-30 report.pdf');
    expect(evaluation.reasonTags).toEqual(['DateTime', 'Original']);
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
    expect(evaluation.decision.reasons).toContain('missing:datetime');
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

    expect(evaluation.rename?.filename).toBe(
      '2025-04-01_10-30 meeting_notes.txt',
    );
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

    expect(evaluation.rename?.filename).toBe(
      '2025-04-01_10-30 release-notes.md',
    );
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

    expect(evaluation.rename?.filename).toBe(
      '2025-04-01_10-30 My project plan.docx',
    );
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

    expect(evaluation.rename?.filename).toBe(
      '2025-04-01_10-30 release.notes.txt',
    );
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
      '2025-04-01_10-30 project_overview-v2 final.docx',
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

    expect(evaluation.rename?.filename).toBe('2025-04-01_10-30 report-.txt');
  });
});

describe('evaluateInstantBaseline (file-type awareness)', () => {
  const capturedAt = 1_700_000_000_000;

  it('preserves multi-part archive extensions and classifies as archive', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'original-with-date',
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
    // Input: 2025-05-04T10:15:30Z (UTC), Expected: 2025-05-04_12-15 (UTC+2)
    expect(evaluation.rename?.filename).toBe('2025-05-04_12-15 bundle.tar.gz');
  });

  it.each([
    ['audio/mpeg', 'song.mp3', 'audio'],
    ['video/x-matroska', 'clip.weird', 'video'],
    ['application/x-7z-compressed', 'archive.unknownext', 'archive'],
  ] as const)('classifies %s downloads as %s', (mime, filename, expectedType) => {
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
  });
});
