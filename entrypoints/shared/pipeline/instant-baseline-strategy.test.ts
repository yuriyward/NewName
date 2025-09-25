import { describe, expect, it } from 'vitest';
import type { InstantBaselineSignals } from '@/entrypoints/shared/context/page-analyzer';
import { DEFAULT_SETTINGS } from '@/entrypoints/shared/settings/types';
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
    expect(evaluation.rename?.filename).toBe('Report 2025-04-01.pdf');
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
